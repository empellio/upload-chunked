# Server API

`createUploadHandler(options)` returns adapters:
- express(): (req, res) => Promise<void>
- fastify(): (req, res) => Promise<void>
- koa(): async (ctx) => Promise<void>

Options:
- storage: local|s3|gcs|azure
- tempDir: string
- maxFileSize?: number
- cleanupInterval?: number
- allowMimeTypes?: string[]

Endpoints:
- POST /upload?fileId&chunkIndex&totalChunks (binary body)
- GET  /upload/status?fileId -> { received: number[] }
- POST /upload/complete?fileId (json: { fileName, fileSize, totalChunks, checksum?, metadata? })

Checksums:
- Per-chunk header `x-content-checksum: sha256;<hex>`
- Final checksum in payload `checksum: "sha256;<hex>"`
