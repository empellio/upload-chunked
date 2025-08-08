# Checksums & Resume

## Checksums
- Per-chunk: `x-content-checksum: sha256;<hex>` -> server validates
- Final: `{ checksum: "sha256;<hex>" }` -> server validates merged file

## Resume
- Client stores uploaded chunk indices in localStorage (or memory in Node).
- On start, client queries `/upload/status?fileId` and uploads missing chunks only.
