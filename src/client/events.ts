export type EventMap = Record<string, unknown>

export class TypedEventEmitter<E extends EventMap> {
  private listeners: { [K in keyof E]?: Array<(payload: E[K]) => void> } = {}

  on<K extends keyof E>(eventName: K, listener: (payload: E[K]) => void): void {
    const arr = this.listeners[eventName] ?? []
    arr.push(listener)
    this.listeners[eventName] = arr
  }

  off<K extends keyof E>(eventName: K, listener: (payload: E[K]) => void): void {
    const arr = this.listeners[eventName] ?? []
    this.listeners[eventName] = arr.filter((l) => l !== listener)
  }

  emit<K extends keyof E>(eventName: K, payload: E[K]): void {
    const arr = this.listeners[eventName] ?? []
    for (const l of arr) l(payload)
  }
}
