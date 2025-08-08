import { promises as fs } from 'node:fs'
import path from 'node:path'

export async function listReceivedChunks(tempDir: string, fileId: string): Promise<number[]> {
  const dir = path.join(tempDir, fileId)
  try {
    const entries = await fs.readdir(dir)
    return entries
      .filter((e) => e.endsWith('.part'))
      .map((e) => parseInt(e.replace('.part', ''), 10))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b)
  } catch {
    return []
  }
}
