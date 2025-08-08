import { webcrypto } from 'node:crypto'

export async function decryptAesGcm(data: Buffer, ivB64: string, key: Buffer | ArrayBuffer): Promise<Buffer> {
  const iv = Buffer.from(ivB64, 'base64')
  const cryptoKey = await webcrypto.subtle.importKey('raw', key as ArrayBuffer, { name: 'AES-GCM' }, false, ['decrypt'])
  const ab = await webcrypto.subtle.decrypt({ name: 'AES-GCM', iv: (iv.buffer as unknown as ArrayBuffer) }, cryptoKey, data)
  return Buffer.from(new Uint8Array(ab))
}
