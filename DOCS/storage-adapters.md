# Storage Adapters

## Local
- Temp chunks in `tempDir/<fileId>/<index>.part`
- Final file assembled into `storage.directory`

## S3 (Multipart Upload)
- Initiates multipart upload, uploads parts per chunk, completes on finalize.
- Configure bucket and optional prefix.

## GCS / Azure
- Skeletons included; implement multipart/compose equivalents as needed.
