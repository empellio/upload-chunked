import { IncomingMessage, ServerResponse } from 'node:http'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { LocalStorageAdapter } from './adapters/local'
import { S3StorageAdapter } from './adapters/s3'
import { GCSStorageAdapter } from './adapters/gcs'
import { AzureBlobStorageAdapter } from './adapters/azure'
import { listReceivedChunks } from './merge'
import type { StorageAdapter, UploadHandlerOptions, UploadSessionStatus } from './types'
import { createHash } from 'node:crypto'
import { decryptAesGcm } from './crypto'

async function readRequestBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

function createAdapter(options: UploadHandlerOptions): StorageAdapter {
  if (options.storage.type === 'local') {
    return new LocalStorageAdapter(options.storage.directory, options.tempDir)
  }
  if (options.storage.type === 's3') {
    return new S3StorageAdapter({ bucket: options.storage.bucket, prefix: options.storage.prefix })
  }
  if (options.storage.type === 'gcs') {
    return new GCSStorageAdapter({ bucket: options.storage.bucket, prefix: options.storage.prefix })
  }
  if (options.storage.type === 'azure') {
    return new AzureBlobStorageAdapter({ container: options.storage.container, prefix: options.storage.prefix })
  }
  throw new Error(`Storage adapter not implemented: ${(options.storage as any).type}`)
}

export function createUploadHandler(options: UploadHandlerOptions) {
  const adapter = createAdapter(options)
  const tempDir = options.tempDir

  async function handleChunk(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://local')
    const fileId = url.searchParams.get('fileId') ?? ''
    const chunkIndex = Number(url.searchParams.get('chunkIndex') ?? '-1')
    const totalChunks = Number(url.searchParams.get('totalChunks') ?? '-1')

    if (!fileId || chunkIndex < 0 || totalChunks <= 0) {
      res.statusCode = 400
      res.end('Invalid params')
      return
    }

    let body = await readRequestBody(req)

    // Optional per-chunk checksum verification
    const checksumHeader = String((req as any).headers?.['x-content-checksum'] ?? req.headers['x-content-checksum'] ?? '')
    if (checksumHeader) {
      const [rawAlgo, digest] = checksumHeader.split(';') as [string | undefined, string | undefined]
      const supported: string[] = ['sha256']
      const algo = (rawAlgo ?? '').toLowerCase()
      if (!supported.includes(algo)) {
        res.statusCode = 400
        res.end('Unsupported checksum algorithm')
        return
      }
      const computed = createHash('sha256').update(body).digest('hex')
      if (!digest || computed !== digest) {
        res.statusCode = 400
        res.end('Checksum mismatch')
        return
      }
    }

    if (options.maxFileSize && body.length > options.maxFileSize) {
      res.statusCode = 413
      res.end('Payload too large')
      return
    }

    // Optional decryption
    if (options.decrypt) {
      const ivB64 = String((req as any).headers?.['x-content-iv'] ?? req.headers['x-content-iv'] ?? '')
      if (!ivB64) {
        res.statusCode = 400
        res.end('Missing IV for encrypted chunk')
        return
      }
      try {
        body = await decryptAesGcm(body, ivB64, options.decrypt.key)
      } catch {
        res.statusCode = 400
        res.end('Chunk decryption failed')
        return
      }
    }

    await adapter.saveChunk(fileId, chunkIndex, body)

    res.statusCode = 200
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ ok: true }))
  }

  async function handleComplete(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://local')
    const fileId = url.searchParams.get('fileId') ?? ''
    if (!fileId) {
      res.statusCode = 400
      res.end('Invalid params')
      return
    }
    const body = await readRequestBody(req)
    let payload: any = {}
    try {
      payload = JSON.parse(body.toString('utf8') || '{}')
    } catch {
      payload = {}
    }

    const received = await listReceivedChunks(tempDir, fileId)
    const totalChunks = Number(payload.totalChunks ?? received.length)

    const filePath = await adapter.finalize(fileId, totalChunks, payload)

    // Optional final checksum verification (sha256 only for now)
    if (payload.checksum && typeof payload.checksum === 'string') {
      const [algo, hex] = String(payload.checksum).includes(';')
        ? String(payload.checksum).split(';')
        : ['sha256', String(payload.checksum)]
      if (algo !== 'sha256') {
        res.statusCode = 400
        res.end('Unsupported final checksum algorithm')
        return
      }
      try {
        const fileBuf = await fs.readFile(filePath)
        const computed = createHash('sha256').update(fileBuf).digest('hex')
        if (computed !== hex) {
          res.statusCode = 400
          res.end('Final checksum mismatch')
          return
        }
      } catch {
        // If reading file fails, return error
        res.statusCode = 500
        res.end('Failed to verify final checksum')
        return
      }
    }

    res.statusCode = 200
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ fileId, url: filePath, metadata: payload.metadata ?? {} }))
  }

  async function handleStatus(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://local')
    const fileId = url.searchParams.get('fileId') ?? ''
    if (!fileId) {
      res.statusCode = 400
      res.end('Invalid params')
      return
    }
    const received = await listReceivedChunks(tempDir, fileId)
    const status: UploadSessionStatus = { fileId, received }
    res.statusCode = 200
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify(status))
  }

  // Express/Fastify/Koa adapters - mount the same function and branch by path
  function express() {
    return async (req: any, res: any) => {
      const urlPath = (req.url ?? '') as string
      if (req.method === 'GET' && urlPath.includes('/status')) return handleStatus(req, res)
      if (req.method === 'POST' && urlPath.includes('/complete')) return handleComplete(req, res)
      if (req.method === 'POST') return handleChunk(req, res)
      res.statusCode = 405
      res.end('Method Not Allowed')
    }
  }

  function fastify() {
    return async (req: any, res: any) => {
      const urlPath = (req.url ?? '') as string
      if (req.method === 'GET' && urlPath.includes('/status')) return handleStatus(req.raw ?? req, res.raw ?? res)
      if (req.method === 'POST' && urlPath.includes('/complete')) return handleComplete(req.raw ?? req, res.raw ?? res)
      if (req.method === 'POST') return handleChunk(req.raw ?? req, res.raw ?? res)
      res.statusCode = 405
      res.end('Method Not Allowed')
    }
  }

  function koa() {
    return async (ctx: any) => {
      const req: IncomingMessage = ctx.req
      const res: ServerResponse = ctx.res
      const urlPath = (req.url ?? '') as string
      if (req.method === 'GET' && urlPath.includes('/status')) return handleStatus(req, res)
      if (req.method === 'POST' && urlPath.includes('/complete')) return handleComplete(req, res)
      if (req.method === 'POST') return handleChunk(req, res)
      res.statusCode = 405
      res.end('Method Not Allowed')
    }
  }

  return { express, fastify, koa, handleChunk, handleComplete, handleStatus }
}
