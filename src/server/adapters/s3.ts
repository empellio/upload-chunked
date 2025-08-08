// S3 adapter using AWS SDK v3 Multipart Upload
import type { StorageAdapter } from '../types'
import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3'

type Init = { bucket: string; prefix?: string; client?: S3Client }

type UploadState = {
  uploadId: string
  parts: { PartNumber: number; ETag: string }[]
}

export class S3StorageAdapter implements StorageAdapter {
  private client: S3Client
  private state = new Map<string, UploadState>()
  constructor(private init: Init) {
    this.client = init.client ?? new S3Client({})
  }

  private key(fileId: string): string {
    return this.init.prefix ? `${this.init.prefix.replace(/\/$/, '')}/${fileId}` : fileId
  }

  private async ensureUpload(fileId: string): Promise<UploadState> {
    const existing = this.state.get(fileId)
    if (existing) return existing
    const resp = await this.client.send(
      new CreateMultipartUploadCommand({ Bucket: this.init.bucket, Key: this.key(fileId) })
    )
    if (!resp.UploadId) throw new Error('Failed to initiate multipart upload')
    const s: UploadState = { uploadId: resp.UploadId, parts: [] }
    this.state.set(fileId, s)
    return s
  }

  async saveChunk(fileId: string, chunkIndex: number, chunkBuffer: Buffer): Promise<void> {
    const upload = await this.ensureUpload(fileId)
    const partNumber = chunkIndex + 1
    const resp = await this.client.send(
      new UploadPartCommand({
        Bucket: this.init.bucket,
        Key: this.key(fileId),
        UploadId: upload.uploadId,
        PartNumber: partNumber,
        Body: chunkBuffer,
      })
    )
    if (!resp.ETag) throw new Error('Missing ETag from S3 UploadPart')
    upload.parts.push({ PartNumber: partNumber, ETag: resp.ETag })
  }

  async finalize(fileId: string, totalChunks: number): Promise<string> {
    const upload = this.state.get(fileId)
    if (!upload) throw new Error('No multipart upload session')
    // Ensure parts are sorted by part number
    upload.parts.sort((a, b) => a.PartNumber - b.PartNumber)
    const resp = await this.client.send(
      new CompleteMultipartUploadCommand({
        Bucket: this.init.bucket,
        Key: this.key(fileId),
        UploadId: upload.uploadId,
        MultipartUpload: { Parts: upload.parts },
      })
    )
    this.state.delete(fileId)
    const url = `s3://${this.init.bucket}/${this.key(fileId)}`
    return url
  }

  async getChunk(): Promise<Buffer | null> {
    // Not supported for S3 in this simplified adapter
    return null
  }

  async deleteChunks(fileId: string): Promise<void> {
    const upload = this.state.get(fileId)
    if (upload) {
      await this.client.send(
        new AbortMultipartUploadCommand({
          Bucket: this.init.bucket,
          Key: this.key(fileId),
          UploadId: upload.uploadId,
        })
      )
      this.state.delete(fileId)
    }
  }
}


