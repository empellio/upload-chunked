# Quick Start

## Client
```ts
import { createUploader } from '@empellio/upload-chunked/client'

const uploader = createUploader({
  endpoint: '/upload',
  chunkSize: 5 * 1024 * 1024,
  concurrency: 3,
  storageKey: 'upload-state',
  checksum: 'sha256',
  maxRetries: 3,
})

uploader.on('progress', (p) => console.log(p.percentage))
await uploader.upload(file, { fileId: 'my-file' })
```

## Server (Express)
```ts
import { createUploadHandler } from '@empellio/upload-chunked/server'
import path from 'node:path'

const handler = createUploadHandler({
  storage: { type: 'local', directory: path.join(process.cwd(), 'uploads') },
  tempDir: path.join(process.cwd(), 'tmp')
})

app.post('/upload', handler.express())
```

## Server (Fastify)
```ts
import Fastify from 'fastify'
import path from 'node:path'
import { createUploadHandler } from '@empellio/upload-chunked/server'

const app = Fastify()
const handler = createUploadHandler({
  storage: { type: 'local', directory: path.join(process.cwd(), 'uploads') },
  tempDir: path.join(process.cwd(), 'tmp')
})

app.post('/upload', handler.fastify())
await app.listen({ port: 3000 })
```
