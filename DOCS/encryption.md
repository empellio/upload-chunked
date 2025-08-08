# Encryption (Optional)

- Client can encrypt each chunk (AES-256-GCM). Provide `UploadOptions.encryption = { algorithm: 'aes-256-gcm', key }`.
- Client sends IV via header `x-content-iv: <base64>`.
- Server can decrypt chunks by setting `decrypt: { algorithm: 'aes-256-gcm', key }` in handler options.
- Checksum is computed on the transmitted payload (after encryption on client, after decryption on server). For end-to-end integrity, prefer final checksum.

Security notes:
- Manage keys outside of this library. Rotate regularly.
- Consider TLS pinning and presigned URLs.
