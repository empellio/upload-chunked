import { promises as fs } from 'node:fs'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import { createReadStream, createWriteStream } from 'node:fs'
import type { StorageAdapter } from '../types'

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true })
}

export class LocalStorageAdapter implements StorageAdapter {
  constructor(private baseDir: string, private tempDir: string) {}

  private tempChunkPath(fileId: string, chunkIndex: number): string {
    return path.join(this.tempDir, fileId, `${chunkIndex}.part`)
  }

  private finalFilePath(fileId: string, metadata?: Record<string, unknown>): string {
    const fileName = (metadata?.fileName as string | undefined) ?? `${fileId}.bin`
    return path.join(this.baseDir, fileName)
  }

  async saveChunk(fileId: string, chunkIndex: number, chunkBuffer: Buffer): Promise<void> {
    const chunkDir = path.join(this.tempDir, fileId)
    await ensureDir(chunkDir)
    await fs.writeFile(this.tempChunkPath(fileId, chunkIndex), chunkBuffer)
  }

  async finalize(fileId: string, totalChunks: number, metadata?: Record<string, unknown>): Promise<string> {
    const outPath = this.finalFilePath(fileId, metadata)
    await ensureDir(path.dirname(outPath))

    const writeStream = createWriteStream(outPath)
    for (let i = 0; i < totalChunks; i += 1) {
      const partPath = this.tempChunkPath(fileId, i)
      const exists = await fs
        .access(partPath)
        .then(() => true)
        .catch(() => false)
      if (!exists) throw new Error(`Missing chunk ${i} for ${fileId}`)
      await pipeline(createReadStream(partPath), writeStream, { end: false })
    }
    writeStream.end()

    // Cleanup temp chunks
    await this.deleteChunks(fileId)

    return outPath
  }

  async getChunk(fileId: string, chunkIndex: number): Promise<Buffer | null> {
    const p = this.tempChunkPath(fileId, chunkIndex)
    try {
      return await fs.readFile(p)
    } catch {
      return null
    }
  }

  async deleteChunks(fileId: string): Promise<void> {
    const dir = path.join(this.tempDir, fileId)
    try {
      const entries = await fs.readdir(dir).catch(() => [])
      await Promise.all(entries.map((e) => fs.rm(path.join(dir, e), { force: true })))
      await fs.rmdir(dir).catch(() => {})
    } catch {
      // ignore
    }
  }
}
