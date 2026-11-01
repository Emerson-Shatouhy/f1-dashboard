import React from 'react'
import { useLapCountStore } from '@renderer/stores/lapCountStore'
import { useSessionInfoStore } from '@renderer/stores/sessionInfoStore'
import { useCountdownTimer } from '@renderer/hooks/useCountdownTimer'
import { useTrackStatusStore } from '@renderer/stores/trackStatusStore'
import { getTrackStatusConfig } from '@renderer/utils/trackStatus'

export function ProjectorStatusBar(): React.JSX.Element {
  const sessionInfo = useSessionInfoStore((state) => state.sessionInfo)
  const { CurrentLap, TotalLaps } = useLapCountStore()
  const countdownTime = useCountdownTimer()
  const trackStatus = useTrackStatusStore((state) => state.trackStatus)

  const isRace = sessionInfo?.Type === 'Race'
  const { label, color, pulse, clear } = getTrackStatusConfig(trackStatus?.Status)

  return (
    <div
      className="flex w-full shrink-0 items-stretch overflow-hidden rounded-md border-t-2 transition-colors duration-500"
      style={{
        borderTopColor: color,
        backgroundColor: clear
          ? 'var(--color-surface-1)'
          : `color-mix(in srgb, ${color} 18%, var(--color-surface-1))`
      }}
    >
      <div className="flex shrink-0 flex-col justify-center border-r border-line-strong px-6 py-2">
        <span className="text-xs font-medium text-ink-3">{isRace ? 'Lap' : 'Remaining'}</span>
        <span className="text-[clamp(24px,5vh,56px)] leading-none font-semibold text-ink tabular-nums">
          {isRace ? (
            <>
              {CurrentLap}
              <span className="text-ink-3"> / {TotalLaps}</span>
            </>
          ) : (
            countdownTime
          )}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-center gap-4 px-6 py-2">
        <span
          className={`h-[clamp(12px,2vh,20px)] w-[clamp(12px,2vh,20px)] shrink-0 rounded-full ${pulse}`}
          style={{ backgroundColor: color }}
        />
        <span
          className="truncate text-[clamp(24px,5vh,56px)] leading-none font-semibold transition-colors duration-500"
          style={{ color }}
        >
          {label}
        </span>
      </div>
    </div>
  )
}
