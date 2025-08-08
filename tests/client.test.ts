import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createUploader } from '../src/client/uploader'

const responses: Record<string, any> = {}

function okJson(data: any) {
  return {
    ok: true,
    status: 200,
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as Response
}

beforeEach(() => {
  ;(globalThis as any).fetch = vi.fn(async (input: any, init?: any) => {
    const url = typeof input === 'string' ? input : input.toString()
    if (url.includes('/status')) return okJson({ received: [] })
    if (url.includes('/complete')) return okJson({ url: '/uploads/final.bin' })
    return okJson({ ok: true })
  })
})

describe('client uploader', () => {
  it('uploads a small blob in chunks and completes', async () => {
    const uploader = createUploader({
      endpoint: '/upload',
      chunkSize: 3,
      concurrency: 2,
      storageKey: 'test-key',
      checksum: false,
    })

    const data = new Blob([new Uint8Array([1, 2, 3, 4, 5])])

    let progressed = false
    uploader.on('progress', (p) => {
      progressed = true
      expect(p.total).toBe(5)
      expect(p.percentage).toBeGreaterThanOrEqual(0)
    })

    const result = await uploader.upload(data, { fileId: 'file-1' })
    expect(result.fileId).toBe('file-1')
    expect(result.url).toBe('/uploads/final.bin')
    expect(progressed).toBe(true)
  })
})
