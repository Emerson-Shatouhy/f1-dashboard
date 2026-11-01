import React from 'react'
import { useTrackStatusStore } from '@renderer/stores/trackStatusStore'
import { getTrackStatusConfig } from '@renderer/utils/trackStatus'

export function TrackStatusIndicator(): React.JSX.Element {
  const status = useTrackStatusStore((state) => state.trackStatus?.Status)
  const { label, color, pulse, clear } = getTrackStatusConfig(status)

  // Quiet while the track is clear; a solid fill when anything needs attention
  return (
    <div
      className="flex shrink-0 items-center gap-2 rounded px-2.5 py-1 text-sm font-semibold whitespace-nowrap transition-colors duration-500"
      style={clear ? { color } : { backgroundColor: color, color: 'var(--color-surface-0)' }}
    >
      <span
        className={`h-2 w-2 rounded-full ${pulse}`}
        style={{ backgroundColor: clear ? color : 'var(--color-surface-0)' }}
      />
      {label}
    </div>
  )
}
