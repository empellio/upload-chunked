export function isAllowedMime(mime: string, allow?: string[]): boolean {
  if (!allow || allow.length === 0) return true
  return allow.includes(mime)
}

export function assertMaxSize(size: number, max?: number): void {
  if (max && size > max) throw new Error(`Max size exceeded: ${size} > ${max}`)
}
