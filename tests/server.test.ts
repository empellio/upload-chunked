import { describe, it, expect, beforeEach } from 'vitest'
import { createUploadHandler } from '../src/server/handler'
import path from 'node:path'
import { promises as fs } from 'node:fs'

function createReq(url: string, method: string, body?: Buffer): any {
  const chunks = body ? [body] : []
  return {
    url,
    method,
    headers: {},
    async *[Symbol.asyncIterator]() {
      for (const c of chunks) yield c
    },
  }
}

function createRes(): { res: any; data(): Promise<string>; status(): number } {
  let buf = Buffer.alloc(0)
  let finished = false
  const res = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    setHeader(key: string, value: string) {
      this.headers[key.toLowerCase()] = value
    },
    end(chunk?: any) {
      if (chunk) buf = Buffer.concat([buf, Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))])
      finished = true
    },
  }
  return {
    res,
    async data() {
      const start = Date.now()
      while (!finished) {
        if (Date.now() - start > 2000) break
        await new Promise((r) => setTimeout(r, 5))
      }
      return buf.toString('utf8')
    },
    status() {
      return res.statusCode
    },
  }
}

describe('server handler (local adapter)', () => {
  const tmp = path.join(process.cwd(), '.test-tmp')
  const uploads = path.join(process.cwd(), '.test-uploads')

  beforeEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true })
    await fs.rm(uploads, { recursive: true, force: true })
    await fs.mkdir(tmp, { recursive: true })
    await fs.mkdir(uploads, { recursive: true })
  })

  it('saves chunks and finalizes file', async () => {
    const handler = createUploadHandler({ storage: { type: 'local', directory: uploads }, tempDir: tmp })

    // upload two chunks
    let req = createReq('/upload?fileId=f1&chunkIndex=0&totalChunks=2', 'POST', Buffer.from('abc'))
    let rec = createRes()
    await handler.handleChunk(req as any, rec.res)

    req = createReq('/upload?fileId=f1&chunkIndex=1&totalChunks=2', 'POST', Buffer.from('def'))
    rec = createRes()
    await handler.handleChunk(req as any, rec.res)

    // finalize
    req = createReq('/upload/complete?fileId=f1', 'POST', Buffer.from(JSON.stringify({ fileName: 'f.txt', totalChunks: 2 })))
    rec = createRes()
    await handler.handleComplete(req as any, rec.res)
    const payload = JSON.parse(await rec.data())

    expect(payload.url).toContain('f.txt')
    const content = await fs.readFile(path.join(uploads, 'f.txt'), 'utf8')
    expect(content).toBe('abcdef')
  })
})
