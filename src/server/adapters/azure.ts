// Minimal Azure Blob Storage adapter (skeleton)
import type { StorageAdapter } from '../types'

type Init = { container: string; prefix?: string }

export class AzureBlobStorageAdapter implements StorageAdapter {
  constructor(private init: Init) {}

  async saveChunk(): Promise<void> {
    throw new Error('Azure adapter not implemented in this skeleton')
  }
  async finalize(): Promise<string> {
    throw new Error('Azure adapter not implemented in this skeleton')
  }
  async getChunk(): Promise<Buffer | null> {
    return null
  }
  async deleteChunks(): Promise<void> {}
}


