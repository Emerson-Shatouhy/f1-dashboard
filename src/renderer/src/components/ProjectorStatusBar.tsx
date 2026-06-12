import React from 'react'
import { Flag } from 'lucide-react'
import { useLapCountStore } from '@renderer/stores/lapCountStore'
import { useSessionInfoStore } from '@renderer/stores/sessionInfoStore'
import { useCountdownTimer } from '@renderer/hooks/useCountdownTimer'
import { useTrackStatusStore } from '@renderer/stores/trackStatusStore'

function getStatusConfig(status: string): {
  label: string
  textColor: string
  borderColor: string
  bgColor: string
  dotColor: string
  pulse: string
} {
  switch (status) {
    case '1':
      return { label: 'Track Clear', textColor: 'text-green-400', borderColor: 'border-green-500/40', bgColor: 'bg-green-500/10', dotColor: 'bg-green-400', pulse: 'animate-pulse' }
    case '2':
      return { label: 'Yellow Flag', textColor: 'text-yellow-400', borderColor: 'border-yellow-500/40', bgColor: 'bg-yellow-500/10', dotColor: 'bg-yellow-400', pulse: 'animate-[pulse_1s_ease-in-out_infinite]' }
    case '4':
      return { label: 'Safety Car', textColor: 'text-blue-400', borderColor: 'border-blue-500/40', bgColor: 'bg-blue-500/10', dotColor: 'bg-blue-400', pulse: 'animate-pulse' }
    case '5':
      return { label: 'Red Flag', textColor: 'text-red-400', borderColor: 'border-red-500/40', bgColor: 'bg-red-500/10', dotColor: 'bg-red-400', pulse: 'animate-[pulse_0.75s_ease-in-out_infinite]' }
    case '6':
      return { label: 'Virtual Safety Car', textColor: 'text-purple-400', borderColor: 'border-purple-500/40', bgColor: 'bg-purple-500/10', dotColor: 'bg-purple-400', pulse: 'animate-[pulse_1s_ease-in-out_infinite]' }
    case '7':
      return { label: 'VSC Ending', textColor: 'text-amber-400', borderColor: 'border-amber-500/40', bgColor: 'bg-amber-500/10', dotColor: 'bg-amber-400', pulse: 'animate-[pulse_1s_ease-in-out_infinite]' }
    default:
      return { label: '—', textColor: 'text-gray-400', borderColor: 'border-gray-700', bgColor: 'bg-gray-800/60', dotColor: 'bg-gray-500', pulse: 'animate-pulse' }
  }
}

export function ProjectorStatusBar(): React.JSX.Element {
  const sessionInfo = useSessionInfoStore((state) => state.sessionInfo)
  const { CurrentLap, TotalLaps } = useLapCountStore()
  const countdownTime = useCountdownTimer()
  const trackStatus = useTrackStatusStore((state) => state.trackStatus)

  const isRace = sessionInfo?.Type === 'Race'
  const { label, textColor, borderColor, bgColor, dotColor, pulse } = getStatusConfig(trackStatus?.Status || '0')

  return (
    <div className={`flex items-stretch w-full rounded-xl border-2 ${borderColor} ${bgColor} overflow-hidden transition-colors duration-500`}>
      {/* Timer / Lap counter — left pill */}
      <div className="flex items-center gap-4 px-8 py-4 border-r-2 border-gray-700/60 shrink-0">
        <div className="flex flex-col items-center leading-none">
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">
            {isRace ? 'Lap' : 'Remaining'}
          </span>
          <span className="font-mono text-5xl font-bold text-white tracking-widest tabular-nums">
            {isRace ? (
              <>{CurrentLap}<span className="text-2xl text-gray-500 font-normal mx-1">/</span>{TotalLaps}</>
            ) : (
              countdownTime
            )}
          </span>
        </div>
      </div>

      {/* Track status — takes the rest */}
      <div className={`flex flex-1 items-center justify-center gap-5 px-8 py-4 transition-colors duration-500`}>
        <span className={`w-5 h-5 rounded-full shrink-0 ${dotColor} ${pulse}`} />
        <div className="flex items-center gap-3">
          <Flag className={`w-8 h-8 shrink-0 ${textColor}`} />
          <span className={`font-bold text-5xl uppercase tracking-widest ${textColor} transition-colors duration-500`}>
            {label}
          </span>
        </div>
      </div>
    </div>
  )
}
