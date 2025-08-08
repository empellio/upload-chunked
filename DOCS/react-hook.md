# React Hook: useUploader

```ts
import { useUploader } from '@empellio/upload-chunked/react'

const { isUploading, isPaused, progress, error, result, upload, pause, resume } = useUploader({
  endpoint: '/upload', chunkSize: 5 * 1024 * 1024, concurrency: 3, storageKey: 'upload', checksum: 'sha256'
})
// call upload(file, { fileId })
```

- `isUploading`, `isPaused` – stav
- `progress` – { loaded, total, percentage }
- `error`, `result`
- `pause()`, `resume()`
