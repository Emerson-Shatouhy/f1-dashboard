import React from 'react'
import { useRaceControlMessagesStore } from '@renderer/stores/raceControlMessagesStore'
import { Flag, AlertTriangle, Shield, Info, Siren } from 'lucide-react'
import type { RaceControlMessage } from '@renderer/types/liveTimingTypes'

interface MessageStyle {
  color: string
  Icon: React.ComponentType<{ size?: number }>
}

function getMessageStyle(message: Partial<RaceControlMessage>): MessageStyle {
  const msgLower = message.Message?.toLowerCase() ?? ''
  const isVSC =
    (message.Category === 'SafetyCar' && msgLower.includes('virtual')) || msgLower.includes('vsc')

  if (message.Flag === 'CHEQUERED') {
    return { color: 'var(--color-ink)', Icon: Flag }
  }
  // Whole-word match: "CHEQUERED FLAG" contains the text "RED FLAG"
  if (message.Flag === 'RED' || /\bRED FLAG\b/.test(message.Message ?? '')) {
    return { color: 'var(--color-flag-red)', Icon: Flag }
  }
  if (message.Flag === 'YELLOW' || message.Flag === 'DOUBLE YELLOW') {
    return { color: 'var(--color-flag-yellow)', Icon: Flag }
  }
  if (message.Flag === 'GREEN' || message.Flag === 'CLEAR') {
    return { color: 'var(--color-flag-clear)', Icon: AlertTriangle }
  }
  if (isVSC) {
    return { color: 'var(--color-flag-vsc)', Icon: Siren }
  }
  if (message.Category === 'SafetyCar') {
    return { color: 'var(--color-flag-sc)', Icon: Siren }
  }
  if (
    msgLower.includes('investigation') ||
    msgLower.includes('penalty') ||
    msgLower.includes('offence')
  ) {
    return { color: 'var(--color-slower)', Icon: Shield }
  }
  return { color: 'var(--color-ink-3)', Icon: Info }
}

function formatUtc(utc: string): string {
  // If it looks like a session clock string (HH:MM:SS), return as-is
  if (/^\d{2}:\d{2}:\d{2}$/.test(utc)) return utc
  return new Date(utc).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

export default function RaceControlTable(): React.JSX.Element {
  const { Messages } = useRaceControlMessagesStore()
  const entries = Array.from(Messages.entries()).reverse()

  return (
    <div className="flex h-full min-h-0 w-full flex-col rounded-md bg-surface-1">
      <p className="shrink-0 border-b border-line-strong px-3 py-1.5 text-[11px] font-medium text-ink-3">
        Race control
      </p>
      {entries.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-xs text-ink-3">
          Messages from race control appear here.
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {entries.map(([key, message]) => {
            const { color, Icon } = getMessageStyle(message)
            return (
              <div
                key={key}
                className="flex items-start gap-2 border-b border-line px-3 py-1.5 text-xs"
              >
                <span className="shrink-0 pt-px text-ink-3 tabular-nums">
                  {formatUtc(message.Utc)}
                </span>
                <span style={{ color }} className="shrink-0 pt-px">
                  <Icon size={13} />
                </span>
                <span className="min-w-0 leading-snug text-ink">{message.Message}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function LatestRaceControlMessage(): React.JSX.Element | null {
  const { Messages } = useRaceControlMessagesStore()
  const latest = Array.from(Messages.values()).at(-1)

  if (!latest) return null

  const { color, Icon } = getMessageStyle(latest)

  return (
    <div className="flex shrink-0 items-center gap-3 rounded-md bg-surface-1 px-4 py-2">
      <span style={{ color }} className="shrink-0">
        <Icon size={18} />
      </span>
      <span className="min-w-0 truncate text-[clamp(14px,2vh,22px)] font-medium text-ink">
        {latest.Message}
      </span>
      <span className="ml-auto shrink-0 text-sm text-ink-3 tabular-nums">
        {formatUtc(latest.Utc)}
      </span>
    </div>
  )
}
