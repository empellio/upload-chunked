export type EncryptionConfig = {
  algorithm: 'aes-256-gcm'
  key: ArrayBuffer | Buffer
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.crypto !== 'undefined'
}

export async function encryptChunk(data: ArrayBuffer, cfg?: EncryptionConfig): Promise<{ payload: ArrayBuffer; iv?: Uint8Array; tag?: Uint8Array }>
{
  if (!cfg) return { payload: data }

  if (isBrowser()) {
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const key = await crypto.subtle.importKey('raw', cfg.key as ArrayBuffer, { name: 'AES-GCM' }, false, ['encrypt'])
    const payload = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: (iv.buffer as unknown as ArrayBuffer) }, key, data)
    return { payload, iv }
  } else {
    const { webcrypto } = await import('node:crypto')
    const iv = webcrypto.getRandomValues(new Uint8Array(12))
    const key = await webcrypto.subtle.importKey('raw', cfg.key as ArrayBuffer, { name: 'AES-GCM' }, false, ['encrypt'])
    const payload = await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv: (iv.buffer as unknown as ArrayBuffer) }, key, data)
    return { payload, iv }
  }
}

export async function decryptChunk(data: ArrayBuffer, iv: Uint8Array, cfg?: EncryptionConfig): Promise<ArrayBuffer>
{
  if (!cfg) return data

  if (isBrowser()) {
    const key = await crypto.subtle.importKey('raw', cfg.key as ArrayBuffer, { name: 'AES-GCM' }, false, ['decrypt'])
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: (iv.buffer as unknown as ArrayBuffer) }, key, data)
  } else {
    const { webcrypto } = await import('node:crypto')
    const key = await webcrypto.subtle.importKey('raw', cfg.key as ArrayBuffer, { name: 'AES-GCM' }, false, ['decrypt'])
    return webcrypto.subtle.decrypt({ name: 'AES-GCM', iv: (iv.buffer as unknown as ArrayBuffer) }, key, data)
  }
}
