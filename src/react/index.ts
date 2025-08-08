import { useCallback, useMemo, useRef, useState } from 'react'
import type { UploaderConfig, UploadOptions, UploadResult, ProgressInfo } from '../client/uploader'
import { createUploader } from '../client/uploader'

export type UseUploaderState = {
  isUploading: boolean
  isPaused: boolean
  error: Error | null
  progress: ProgressInfo
  result: UploadResult | null
}

export function useUploader(config: UploaderConfig) {
  const uploaderRef = useRef<ReturnType<typeof createUploader> | null>(null)
  const [state, setState] = useState<UseUploaderState>({
    isUploading: false,
    isPaused: false,
    error: null,
    progress: { loaded: 0, total: 0, percentage: 0 },
    result: null,
  })

  const uploader = useMemo(() => {
    const u = createUploader(config)
    u.on('progress', (p) => setState((s) => ({ ...s, progress: p })))
    u.on('error', (e) => setState((s) => ({ ...s, error: e, isUploading: false })))
    u.on('complete', (r) => setState((s) => ({ ...s, result: r, isUploading: false })))
    uploaderRef.current = u
    return u
  }, [config])

  const upload = useCallback(async (file: Blob | Buffer, options?: UploadOptions) => {
    setState((s) => ({ ...s, isUploading: true, error: null, result: null }))
    return uploader.upload(file, options)
  }, [uploader])

  const pause = useCallback(() => {
    uploaderRef.current?.pause?.()
    setState((s) => ({ ...s, isPaused: true }))
  }, [])

  const resume = useCallback(() => {
    uploaderRef.current?.resume?.()
    setState((s) => ({ ...s, isPaused: false }))
  }, [])

  return { ...state, upload, pause, resume }
}
