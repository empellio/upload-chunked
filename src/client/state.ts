export type StoredUploadState = {
  fileId: string
  uploadedChunkIndices: number[]
  fileSize: number
  fileName?: string
  checksum?: string
}

export type StateStore = {
  get: (fileId: string) => StoredUploadState | null
  set: (state: StoredUploadState) => void
  remove: (fileId: string) => void
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function createStateStore(storageKey: string): StateStore {
  if (isBrowser()) {
    return {
      get(fileId) {
        const raw = window.localStorage.getItem(`${storageKey}:${fileId}`)
        return raw ? (JSON.parse(raw) as StoredUploadState) : null
      },
      set(state) {
        window.localStorage.setItem(`${storageKey}:${state.fileId}`, JSON.stringify(state))
      },
      remove(fileId) {
        window.localStorage.removeItem(`${storageKey}:${fileId}`)
      },
    }
  }

  const mem = new Map<string, StoredUploadState>()
  return {
    get(fileId) {
      return mem.get(fileId) ?? null
    },
    set(state) {
      mem.set(state.fileId, state)
    },
    remove(fileId) {
      mem.delete(fileId)
    },
  }
}
