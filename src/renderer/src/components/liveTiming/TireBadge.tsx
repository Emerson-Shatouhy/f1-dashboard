import { Stint } from '@renderer/types/liveTimingTypes'
import React from 'react'

interface TireBadgeProps {
  stint: Stint | undefined
  large?: boolean
}

const COMPOUND_COLORS: Record<string, string> = {
  SOFT: 'bg-red-500',
  HARD: 'bg-white',
  MEDIUM: 'bg-yellow-400',
  INTERMEDIATE: 'bg-green-500',
  WET: 'bg-blue-500',
}

export function TireBadge({ stint, large }: TireBadgeProps): React.JSX.Element {
  const sz = large ? 'w-5 h-5' : 'w-4 h-4'
  const color = stint?.Compound ? (COMPOUND_COLORS[stint.Compound] ?? 'bg-gray-500') : 'bg-gray-500'
  const label = stint?.Compound
    ? stint.Compound.charAt(0).toUpperCase() + stint.Compound.slice(1).toLowerCase()
    : 'Unknown'
  const tireAge = stint?.TotalLaps != null && stint?.StartLaps != null
    ? stint.TotalLaps - stint.StartLaps + 1
    : null
  const tooltipText = tireAge != null ? `${label} · ${tireAge} lap${tireAge !== 1 ? 's' : ''}` : label

  return (
    <div className="relative group flex items-center justify-center">
      <div className={`${sz} rounded-full ${color} flex-shrink-0`} />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
        {tooltipText}
      </div>
    </div>
  )
}
