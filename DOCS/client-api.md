# Client API

`createUploader(config)` returns an uploader with:
- on(event, cb)
- off(event, cb)
- upload(file, options)
- pause()
- resume()

Config:
- endpoint: string
- chunkSize: number
- concurrency: number
- storageKey: string
- checksum: 'sha256' | 'md5' | false (md5 not supported in browser)
- headers?: Record<string,string>
- maxRetries?: number
- backoff?: { baseMs?, factor?, maxMs?, jitter? }

Events:
- progress: { loaded, total, percentage }
- chunkUploaded: { index, total }
- error: Error
- complete: { fileId, url?, metadata? }
