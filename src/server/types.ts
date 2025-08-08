export type StorageAdapter = {
  saveChunk(fileId: string, chunkIndex: number, chunkBuffer: Buffer): Promise<void>
  finalize(
    fileId: string,
    totalChunks: number,
    metadata?: Record<string, unknown>
  ): Promise<string> // returns file URL/path
  getChunk(fileId: string, chunkIndex: number): Promise<Buffer | null>
  deleteChunks(fileId: string): Promise<void>
}

export type UploadHandlerOptions = {
  storage:
    | { type: 'local'; directory: string }
    | { type: 's3'; bucket: string; prefix?: string }
    | { type: 'gcs'; bucket: string; prefix?: string }
    | { type: 'azure'; container: string; prefix?: string }
  tempDir: string
  maxFileSize?: number
  cleanupInterval?: number
  allowMimeTypes?: string[]
  decrypt?: { algorithm: 'aes-256-gcm'; key: Buffer | ArrayBuffer }
}

export type UploadSessionStatus = { fileId: string; received: number[]; totalChunks?: number }
