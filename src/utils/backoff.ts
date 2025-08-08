export type BackoffOptions = {
  baseMs?: number
  factor?: number
  maxMs?: number
  jitter?: boolean
}

export function computeBackoff(attempt: number, opts: BackoffOptions = {}): number {
  const base = opts.baseMs ?? 250
  const factor = opts.factor ?? 2
  const max = opts.maxMs ?? 8000
  let delay = Math.min(max, base * Math.pow(factor, attempt))
  if (opts.jitter) {
    const rand = Math.random() * delay * 0.2
    delay = delay - delay * 0.1 + rand
  }
  return Math.floor(delay)
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}


