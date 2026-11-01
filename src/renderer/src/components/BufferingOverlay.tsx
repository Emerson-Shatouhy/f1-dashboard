import React from 'react'
import { Tv } from 'lucide-react'
import { useDelayStore } from '@renderer/stores/delayStore'

export function BufferingOverlay(): React.JSX.Element | null {
  const { isBuffering, countdown, delayMs } = useDelayStore()

  if (!isBuffering) return null

  const progress = Math.max(0, Math.min(1, 1 - countdown / (delayMs / 1000)))

  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-surface-0/95">
      <div className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
        <Tv className="h-7 w-7 text-ink-2" />
        <div>
          <p className="text-lg font-semibold text-ink">Syncing with TV broadcast</p>
          <p className="mt-1 text-sm text-ink-2">Buffering {delayMs / 1000}s of data…</p>
        </div>
        <span className="text-5xl font-semibold text-ink tabular-nums">{countdown}s</span>
        <div className="h-1 w-full overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full rounded-full bg-flag-red transition-all duration-500"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
