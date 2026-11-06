import { Stint } from '@renderer/types/liveTimingTypes'
import React from 'react'
import { COMPOUND_COLORS } from '@renderer/utils/tyres'

interface TireBadgeProps {
  stint: Stint | undefined
  hideAge?: boolean
}

export function TireBadge({ stint, hideAge }: TireBadgeProps): React.JSX.Element {
  const compound = stint?.Compound
  const color = (compound && COMPOUND_COLORS[compound]) || 'var(--color-ink-3)'
  const label = compound ? compound.charAt(0) + compound.slice(1).toLowerCase() : 'Unknown'
  // TotalLaps already includes StartLaps, so it is the age of the set, not of the stint
  const age = stint?.TotalLaps
  const used = stint?.New === 'false'
  const title = [
    label,
    used ? 'used set' : null,
    age != null ? `${age} lap${age !== 1 ? 's' : ''}` : null
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <span className="inline-flex items-center gap-1" title={title}>
      <span
        className="flex h-[1.3em] w-[1.3em] shrink-0 items-center justify-center rounded-full border-2 text-[0.7em] font-bold"
        style={{ borderColor: color, color }}
      >
        {compound ? compound.charAt(0) : '?'}
      </span>
      {!hideAge && <span className={used ? 'text-ink-2' : ''}>{age ?? '—'}</span>}
    </span>
  )
}
