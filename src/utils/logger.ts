export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export function createLogger(level: LogLevel = 'info') {
  const order: LogLevel[] = ['debug', 'info', 'warn', 'error']
  const enabled = new Set(order.slice(order.indexOf(level)))
  return {
    debug: (...args: unknown[]) => enabled.has('debug') && console.debug('[upload-chunked]', ...args),
    info: (...args: unknown[]) => enabled.has('info') && console.info('[upload-chunked]', ...args),
    warn: (...args: unknown[]) => enabled.has('warn') && console.warn('[upload-chunked]', ...args),
    error: (...args: unknown[]) => enabled.has('error') && console.error('[upload-chunked]', ...args),
  }
}
