export type ChecksumAlgorithm = 'sha256' | 'md5'

function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function subtleDigest(algorithm: string, data: ArrayBufferLike): Promise<string> {
  if (typeof crypto !== 'undefined' && 'subtle' in crypto) {
    // Web Crypto accepts BufferSource (ArrayBuffer or ArrayBufferView)
    const ab = data as ArrayBuffer
    const result = await (crypto as Crypto).subtle.digest(algorithm, ab)
    return toHex(result)
  }
  // Node fallback
  try {
    const { createHash } = await import('node:crypto')
    const hash = createHash(algorithm)
    hash.update(Buffer.from(new Uint8Array(data as ArrayBuffer)))
    return hash.digest('hex')
  } catch {
    throw new Error('No crypto available for checksum computation')
  }
}

export async function calculateChecksum(
  data: ArrayBufferLike,
  algorithm: ChecksumAlgorithm
): Promise<string> {
  if (algorithm === 'sha256') {
    return subtleDigest('SHA-256', data)
  }
  if (algorithm === 'md5') {
    // MD5 fallback for Node only
    try {
      const { createHash } = await import('node:crypto')
      const hash = createHash('md5')
      hash.update(Buffer.from(new Uint8Array(data as ArrayBuffer)))
      return hash.digest('hex')
    } catch {
      throw new Error('MD5 is not supported in this environment.')
    }
  }
  throw new Error(`Unsupported checksum algorithm: ${algorithm}`)
}
