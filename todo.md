Ok, tady máš úplně rozpitvanou specifikaci pro @empellio/upload-chunked, aby to mohlo fungovat jako generální NPM balíček pro chunkovaný upload souborů – použitelný jak na frontendu, tak na backendu.
Je to napsané jako system prompt, aby ti AI rovnou mohla vygenerovat kompletní repozitář s TypeScriptem, testy a ukázkami.

⸻

System prompt – Specifikace @empellio/upload-chunked

Package name:
@empellio/upload-chunked

Description (EN):
Universal JavaScript/TypeScript library for chunked file uploads with resume support, checksum verification, and pluggable storage backends. Works in browsers, Node.js, and hybrid environments. Provides both a client SDK and server-side handler utilities (Express, Fastify, Laravel adapter) for receiving and assembling chunks.

Key features:
- Chunked uploads for large files (configurable chunk size)
- Pause/resume support
- Resume after browser refresh (localStorage-based state on FE)
- Checksum verification (MD5/SHA-256) per chunk and/or final file
- Parallel chunk uploads
- Retries with exponential backoff for failed chunks
- Pluggable backend storage (local FS, S3, GCS, Azure, custom)
- Server adapters for Express, Fastify, Koa (Node)
- Optional Laravel PHP server implementation for PHP projects
- Progress events + onComplete callback
- Typescript types for everything

---

### **Client-side API**
```ts
import { createUploader } from '@empellio/upload-chunked/client'

const uploader = createUploader({
  endpoint: '/upload',              // Server endpoint for chunk upload
  chunkSize: 5 * 1024 * 1024,        // 5MB
  concurrency: 3,                    // parallel uploads
  storageKey: 'upload-state',        // localStorage key for resume
  checksum: 'sha256',                // or 'md5' | false
  headers: { Authorization: 'Bearer token' }
})

uploader.on('progress', (info) => {
  console.log(`Progress: ${info.percentage}%`)
})

uploader.on('error', (err) => {
  console.error('Upload failed:', err)
})

uploader.on('complete', (result) => {
  console.log('Upload completed:', result)
})

await uploader.upload(file, { fileId: 'my-custom-id' }) // file: File|Blob|Buffer


⸻

Server-side API (Node.js)

import { createUploadHandler } from '@empellio/upload-chunked/server'
import path from 'path'

const handler = createUploadHandler({
  storage: {
    type: 'local',
    directory: path.join(__dirname, 'uploads')
  },
  tempDir: path.join(__dirname, 'tmp'),
  maxFileSize: 5 * 1024 * 1024 * 1024, // 5 GB
  cleanupInterval: 24 * 60 * 60 * 1000 // 24h
})

// Express usage:
app.post('/upload', handler.express())

// Fastify usage:
fastify.post('/upload', handler.fastify())


⸻

Server storage adapters

Built-in:
	•	local → saves chunks to disk, merges on completion
	•	s3 → saves chunks to AWS S3 (multipart upload API)
	•	gcs → saves to Google Cloud Storage
	•	azure → saves to Azure Blob Storage

Custom adapter interface:

type StorageAdapter = {
  saveChunk(fileId: string, chunkIndex: number, chunkBuffer: Buffer): Promise<void>
  finalize(fileId: string, totalChunks: number, metadata?: Record<string, any>): Promise<string> // returns file URL/path
  getChunk(fileId: string, chunkIndex: number): Promise<Buffer | null>
  deleteChunks(fileId: string): Promise<void>
}


⸻

Upload protocol
	1.	Client init → client sends fileId, fileName, fileSize, totalChunks, checksum (optional) to server.
	2.	Server response → either:
	•	Upload session created (returns uploadId + info about already received chunks for resume)
	•	Reject (invalid file type/size)
	3.	Chunk upload → POST /upload?fileId=...&chunkIndex=...
	•	Body: chunk binary (or multipart/form-data)
	•	Headers: Content-Checksum (optional)
	4.	Server validates & stores chunk
	5.	Client retries failed chunks automatically
	6.	After last chunk → client calls /upload/complete?fileId=...
	•	Server merges chunks (or finalizes multipart upload)
	•	Server verifies final checksum if provided
	7.	Server returns final file URL/path

⸻

Resume logic
	•	Client saves:
	•	fileId
	•	uploaded chunks indices
	•	file metadata (size, name, checksum)
	•	On resume:
	•	Client asks server which chunks exist (/upload/status?fileId=...)
	•	Uploads only missing chunks

⸻

Events (client)
	•	progress → { loaded: number, total: number, percentage: number }
	•	chunkUploaded → { index: number, total: number }
	•	error → Error
	•	complete → { fileId, url, metadata }

⸻

Security
	•	Allow file type whitelist (server)
	•	Max file size limit
	•	Optional auth middleware
	•	Signed upload URLs for S3/GCS

⸻

Project structure

src/
  client/
    index.ts
    uploader.ts
    state.ts
    checksum.ts
    events.ts
  server/
    index.ts
    handler.ts
    adapters/
      local.ts
      s3.ts
      gcs.ts
      azure.ts
    merge.ts
    types.ts
  utils/
    validate.ts
    logger.ts
tests/
  client.test.ts
  server.test.ts
package.json
tsconfig.json
README.md


⸻

README (English)

Sections:
	1.	Introduction
	2.	Installation
	3.	Quick start (client + server examples)
	4.	Configuration options (client/server)
	5.	Resuming uploads
	6.	Storage adapters
	7.	Security considerations
	8.	API reference
	9.	License

⸻

package.json metadata

"author": "Empellio OSS",
"license": "MIT",
"homepage": "https://github.com/empellio/upload-chunked#readme",
"bugs": {
  "url": "https://github.com/empellio/upload-chunked/issues"
},
"repository": {
  "type": "git",
  "url": "git+https://github.com/empellio/upload-chunked.git"
}


⸻

Tech stack
	•	TypeScript
	•	ESM + CJS build via tsup
	•	Axios or native fetch for client
	•	Express/Fastify adapters for server
	•	Node streams for merging
	•	Jest or Vitest for tests
	•	ESLint + Prettier
	•	Optional: Web Worker for checksum calculation in browser

⸻

Extra ideas
	•	CLI tool to upload files from terminal with progress bar
	•	Optional encryption of chunks before upload
	•	WebSocket progress updates for server-initiated push
	•	Integration example with AWS S3 multipart upload
	•	Monorepo structure with client and server packages

⸻


---

Jestli chceš, tak ti teď k tomu můžu rovnou udělat **skeleton repa** pro `@empellio/upload-chunked` — klient i server v jednom balíčku, TypeScript ready, aby to šlo hned pustit, testovat a publishnout na npm.  
Chceš, ať to rovnou nahodím?