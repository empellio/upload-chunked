import { TypedEventEmitter } from './events'
import { calculateChecksum, ChecksumAlgorithm } from './checksum'
import { createStateStore, StateStore } from './state'
import { computeBackoff, sleep } from '../utils/backoff'
import type { EncryptionConfig } from '../utils/crypto'
import { encryptChunk } from '../utils/crypto'

export type ProgressInfo = { loaded: number; total: number; percentage: number }
export type UploadResult = { fileId: string; url?: string; metadata?: Record<string, unknown> }

export type UploaderConfig = {
  endpoint: string
  chunkSize: number
  concurrency: number
  storageKey: string
  checksum: ChecksumAlgorithm | false
  headers?: Record<string, string>
  maxRetries?: number
  backoff?: { baseMs?: number; factor?: number; maxMs?: number; jitter?: boolean }
}

export type UploadOptions = {
  fileId?: string
  metadata?: Record<string, unknown>
  encryption?: EncryptionConfig | undefined
}

export type UploaderEvents = {
  progress: ProgressInfo
  chunkUploaded: { index: number; total: number }
  error: Error
  complete: UploadResult
}

export type Uploader = ReturnType<typeof createUploader>

function isBlobLike(input: unknown): input is Blob {
  return typeof Blob !== 'undefined' && input instanceof Blob
}

function isBuffer(input: unknown): input is Buffer {
  return typeof Buffer !== 'undefined' && input instanceof Buffer
}

async function readSlice(source: Blob | Buffer, start: number, end: number): Promise<ArrayBuffer> {
  if (isBlobLike(source)) {
    const blob = (source as Blob).slice(start, end)
    return await blob.arrayBuffer()
  }
  const buf = (source as Buffer).subarray(start, end)
  // Ensure we return a proper ArrayBuffer view copy
  const slice = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  return slice as ArrayBuffer
}

export function createUploader(config: UploaderConfig) {
  const emitter = new TypedEventEmitter<UploaderEvents>()
  const stateStore: StateStore = createStateStore(config.storageKey)
  let paused = false

  const baseUrl = (() => {
    try {
      const u = new URL(config.endpoint, 'http://dummy-base')
      const isAbsolute = /^https?:/i.test(config.endpoint)
      return isAbsolute ? `${u.origin}${u.pathname}` : u.pathname
    } catch {
      return config.endpoint
    }
  })()

  async function getStatus(fileId: string): Promise<number[]> {
    try {
      const statusUrl = `${baseUrl.replace(/\/$/, '')}/status?fileId=${encodeURIComponent(fileId)}`
      const res = await fetch(statusUrl, { headers: config.headers })
      if (!res.ok) return []
      const data = (await res.json()) as { received: number[] }
      return Array.isArray(data.received) ? data.received : []
    } catch {
      return []
    }
  }

  async function upload(
    file: Blob | Buffer,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const fileSize = isBlobLike(file) ? file.size : (file as Buffer).byteLength
    const fileName = isBlobLike(file) ? (file as Blob & { name?: string }).name ?? 'file' : 'file'
    const totalChunks = Math.ceil(fileSize / config.chunkSize)
    const fileId = options.fileId ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`

    let uploaded = new Set<number>(await getStatus(fileId))
    const state = stateStore.get(fileId)
    if (state && state.fileSize === fileSize) {
      for (const idx of state.uploadedChunkIndices) uploaded.add(idx)
    }

    const allIndices = Array.from({ length: totalChunks }, (_, i) => i)
    const pending = allIndices.filter((i) => !uploaded.has(i))

    const progress = { loaded: uploaded.size * config.chunkSize, total: fileSize, percentage: 0 }
    progress.loaded = Math.min(progress.loaded, fileSize)
    progress.percentage = Math.min(100, Math.round((progress.loaded / progress.total) * 100))
    emitter.emit('progress', progress)

    const uploadChunk = async (index: number): Promise<void> => {
      const start = index * config.chunkSize
      const end = Math.min(start + config.chunkSize, fileSize)
      let chunkBuffer = await readSlice(file, start, end)

      let checksumHeader: Record<string, string> = {}
      // Optional encryption per chunk
      if (options.encryption) {
        const encrypted = await encryptChunk(chunkBuffer, options.encryption)
        // Attach IV for server (or store out-of-band). Here we send IV in header (base64)
        const ivB64 = encrypted.iv ? Buffer.from(encrypted.iv).toString('base64') : undefined
        if (ivB64) {
          checksumHeader = { ...checksumHeader, 'x-content-iv': ivB64 }
        }
        chunkBuffer = encrypted.payload
      }

      
      if (config.checksum) {
        const checksum = await calculateChecksum(chunkBuffer, config.checksum)
        checksumHeader = { 'x-content-checksum': `${config.checksum};${checksum}` }
      }

      const uploadUrl = `${baseUrl.replace(/\/$/, '')}?fileId=${encodeURIComponent(fileId)}&chunkIndex=${index}&totalChunks=${totalChunks}`

      let attempt = 0
      const maxRetries = config.maxRetries ?? 3
      while (true) {
        if (paused) {
          await sleep(50)
          continue
        }
        const res = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/octet-stream', ...(config.headers ?? {}), ...checksumHeader },
          body: chunkBuffer as ArrayBuffer,
        })
        if (res.ok) break
        attempt += 1
        if (attempt > maxRetries) {
          const text = await res.text().catch(() => '')
          throw new Error(`Chunk upload failed (${index}): ${res.status} ${text}`)
        }
        await sleep(computeBackoff(attempt - 1, config.backoff))
      }

      uploaded.add(index)
      stateStore.set({
        fileId,
        uploadedChunkIndices: Array.from(uploaded).sort((a, b) => a - b),
        fileSize,
        fileName,
      })

      progress.loaded = Math.min(uploaded.size * config.chunkSize, fileSize)
      progress.percentage = Math.min(100, Math.round((progress.loaded / progress.total) * 100))
      emitter.emit('chunkUploaded', { index, total: totalChunks })
      emitter.emit('progress', { ...progress })
    }

    // Simple promise pool
    let cursor = 0
    const runNext = async (): Promise<void> => {
      if (cursor >= pending.length) return
      const idx = pending[cursor]
      cursor += 1
      if (typeof idx === 'number') {
        await uploadChunk(idx)
      }
      await runNext()
    }

    const workers = Array.from({ length: Math.min(config.concurrency, pending.length) }, () => runNext())
    await Promise.all(workers)

    // Complete
    const completeUrl = `${baseUrl.replace(/\/$/, '')}/complete?fileId=${encodeURIComponent(fileId)}`
    const finalChecksum = config.checksum
      ? await calculateChecksum(await readSlice(file, 0, fileSize), config.checksum)
      : undefined

    const res = await fetch(completeUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(config.headers ?? {}) },
      body: JSON.stringify({ fileName, fileSize, totalChunks, checksum: finalChecksum, metadata: options.metadata ?? {} }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      const error = new Error(`Finalize failed: ${res.status} ${text}`)
      emitter.emit('error', error)
      throw error
    }

    const result = (await res.json().catch(() => ({}))) as UploadResult
    const { fileId: _ignored, ...rest } = (result ?? {}) as any
    const final: UploadResult = { fileId, ...(rest as Omit<UploadResult, 'fileId'>) }

    stateStore.remove(fileId)
    emitter.emit('complete', final)
    return final
  }

  return {
    on: emitter.on.bind(emitter),
    off: emitter.off.bind(emitter),
    upload,
    pause() {
      paused = true
    },
    resume() {
      paused = false
    },
  }
}
