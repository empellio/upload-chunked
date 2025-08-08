import { describe, it, expect, beforeEach, vi } from 'vitest'
import { S3Client, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand } from '@aws-sdk/client-s3'
import { mockClient } from 'aws-sdk-client-mock'
import { S3StorageAdapter } from '../src/server/adapters/s3'

describe('S3StorageAdapter (multipart upload)', () => {
  const s3Mock = mockClient(S3Client)
  const bucket = 'test-bucket'
  const fileId = 'file-xyz'

  beforeEach(() => {
    s3Mock.reset()
  })

  it('uploads parts and completes multipart upload', async () => {
    s3Mock.on(CreateMultipartUploadCommand).resolves({ UploadId: 'u-1' })
    s3Mock.on(UploadPartCommand).callsFake(async (input) => {
      return { ETag: `etag-${input.PartNumber}` } as any
    })
    s3Mock.on(CompleteMultipartUploadCommand).resolves({ Location: `s3://${bucket}/${fileId}` } as any)

    const adapter = new S3StorageAdapter({ bucket, prefix: '' })
    await adapter.saveChunk(fileId, 0, Buffer.from('abc'))
    await adapter.saveChunk(fileId, 1, Buffer.from('def'))
    const url = await adapter.finalize(fileId, 2)
    expect(url).toBe(`s3://${bucket}/${fileId}`)
  })
})


