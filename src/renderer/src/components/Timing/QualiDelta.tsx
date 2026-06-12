import React, { useEffect, useState } from 'react'
import { useQualiDeltaStore } from '../../stores/qualiDeltaStore'
import { useNavigationStore } from '../../stores/navigationStore'

// Hide the readout when the lap stops progressing (red flag, abandoned lap, backed off)
const STALE_MS = 15_000

interface QualiDeltaProps {
  racingNumber: string
}

export function QualiDelta({ racingNumber }: QualiDeltaProps): React.JSX.Element | null {
  const display = useQualiDeltaStore((state) => state.displays[racingNumber])
  const projectorMode = useNavigationStore((s) => s.projectorMode)
  const [, setTick] = useState(0)

  // Re-render every second while a lap is live so the staleness cutoff takes effect
  useEffect(() => {
    if (!display) return undefined
    const id = setInterval(() => setTick((v) => v + 1), 1000)
    return () => clearInterval(id)
  }, [display])

  if (!display || display.deltaMs === null) return null
  if (Date.now() - display.updatedAt > STALE_MS) return null

  const negative = display.deltaMs < 0
  const seconds = Math.abs(display.deltaMs) / 1000
  const textSize = projectorMode ? 'text-base lg:text-lg' : 'text-[11px] sm:text-xs'

  return (
    <div
      className={`flex items-baseline gap-1 font-mono leading-none whitespace-nowrap ${textSize}`}
    >
      {/* Estimated values render dimmer and at 2 decimals; exact ones at 3 */}
      <span
        className={`${negative ? 'text-green-400' : 'text-yellow-400'} ${display.exact ? '' : 'opacity-70'}`}
      >
        {negative ? '−' : '+'}
        {seconds.toFixed(display.exact ? 3 : 2)}
      </span>
      {display.projectedPos !== null && (
        <span className="text-gray-400">→P{display.projectedPos}</span>
      )}
    </div>
  )
}
