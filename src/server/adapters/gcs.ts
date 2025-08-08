import type { StorageAdapter } from '../types'

type Init = { bucket: string; prefix?: string }

export class GCSStorageAdapter implements StorageAdapter {
  constructor(private init: Init) {}

  async saveChunk(): Promise<void> {
    throw new Error('GCS adapter not implemented in this skeleton')
  }
  async finalize(): Promise<string> {
    throw new Error('GCS adapter not implemented in this skeleton')
  }
  async getChunk(): Promise<Buffer | null> {
    return null
  }
  async deleteChunks(): Promise<void> {}
}


