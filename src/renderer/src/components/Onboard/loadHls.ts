import hlsScriptUrl from '../../assets/hls.min.js?url'

export interface HlsErrorData {
  fatal?: boolean
  type?: string
  details?: string
  response?: { code?: number }
}

// Minimal surface of hls.js that the onboard panel uses
export interface HlsInstance {
  loadSource: (url: string) => void
  attachMedia: (el: HTMLVideoElement) => void
  destroy: () => void
  on: (event: string, cb: (event: string, data: HlsErrorData) => void) => void
  startLoad: () => void
  removeLevel?: (index: number) => void
  recoverMediaError: () => void
  latency?: number
  liveSyncPosition?: number | null
  // Wall-clock time of the frame being played, when the playlist carries PROGRAM-DATE-TIME
  playingDate?: Date | null
}

export interface HlsStatic {
  new (config?: Record<string, unknown>): HlsInstance
  isSupported: () => boolean
  Events: { MANIFEST_PARSED: string; ERROR: string }
  ErrorTypes: { NETWORK_ERROR: string; MEDIA_ERROR: string }
}

declare global {
  interface Window {
    Hls?: HlsStatic
  }
}

let loading: Promise<HlsStatic> | null = null

/**
 * hls.js is vendored as a plain script (not an npm dependency) so installing it can't disturb
 * the pinned castlabs Electron build. Loaded once, on first use.
 */
export function loadHls(): Promise<HlsStatic> {
  if (window.Hls) return Promise.resolve(window.Hls)
  if (!loading) {
    loading = new Promise<HlsStatic>((resolve, reject) => {
      const el = document.createElement('script')
      el.src = hlsScriptUrl
      el.onload = (): void => (window.Hls ? resolve(window.Hls) : reject(new Error('Hls missing')))
      el.onerror = (): void => {
        loading = null
        reject(new Error('Could not load hls.js'))
      }
      document.head.appendChild(el)
    })
  }
  return loading
}
