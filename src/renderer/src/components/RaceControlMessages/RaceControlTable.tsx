import React from 'react'
import { useRaceControlMessagesStore } from '@renderer/stores/raceControlMessagesStore'
import { Flag, AlertTriangle, Shield, Info, Siren } from 'lucide-react'

interface MessageStyle {
  bg: string
  border: string
  iconColor: string
  icon: React.ReactNode
}

function getMessageStyle(message: {
  Category?: string
  Flag?: string
  Message?: string
}): MessageStyle {
  const msgLower = message.Message?.toLowerCase() ?? ''
  const isRedFlag = message.Flag === 'RED' || message.Message?.includes('RED FLAG')
  const isYellowFlag = message.Flag === 'YELLOW' || message.Flag === 'DOUBLE YELLOW'
  const isGreenFlag = message.Flag === 'GREEN' || message.Flag === 'CLEAR'
  // VSC: category SafetyCar + message contains "virtual", or explicit VSC text
  const isVSC =
    (message.Category === 'SafetyCar' && msgLower.includes('virtual')) ||
    msgLower.includes('vsc')
  // SC: category SafetyCar but not VSC
  const isSC =
    message.Category === 'SafetyCar' && !isVSC
  const isInvestigation =
    message.Category === 'Drs' ||
    msgLower.includes('investigation') ||
    msgLower.includes('penalty') ||
    msgLower.includes('offence')

  if (isRedFlag) {
    return {
      bg: 'bg-red-950/60',
      border: 'border-red-800/60',
      iconColor: '#ef4444',
      icon: <Flag size={18} />
    }
  }
  if (isYellowFlag) {
    return {
      bg: 'bg-yellow-950/60',
      border: 'border-yellow-700/60',
      iconColor: '#eab308',
      icon: <Flag size={18} />
    }
  }
  if (isGreenFlag) {
    return {
      bg: 'bg-green-950/60',
      border: 'border-green-800/60',
      iconColor: '#22c55e',
      icon: <AlertTriangle size={18} />
    }
  }
  // SC — blue-500, matches TrackStatusIndicator status '4' (SCDeployed)
  if (isSC) {
    return {
      bg: 'bg-blue-950/60',
      border: 'border-blue-800/60',
      iconColor: '#3b82f6',
      icon: <Siren size={18} />
    }
  }
  // VSC — purple-500, matches TrackStatusIndicator status '6' (VSCDeployed)
  if (isVSC) {
    return {
      bg: 'bg-purple-950/60',
      border: 'border-purple-800/60',
      iconColor: '#a855f7',
      icon: <Siren size={18} />
    }
  }
  if (isInvestigation) {
    return {
      bg: 'bg-yellow-900/40',
      border: 'border-yellow-600/50',
      iconColor: '#ca8a04',
      icon: <Shield size={18} />
    }
  }

  // Default / info
  return {
    bg: 'bg-gray-800/60',
    border: 'border-gray-700/60',
    iconColor: '#9ca3af',
    icon: <Info size={18} />
  }
}

function formatUtc(utc: string): string {
  // If it looks like a session clock string (HH:MM:SS), return as-is
  if (/^\d{2}:\d{2}:\d{2}$/.test(utc)) return utc
  return new Date(utc).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

export default function RaceControlTable(): React.JSX.Element {
  const { Messages } = useRaceControlMessagesStore()

  const entries = Array.from(Messages.entries()).reverse().slice(0, 10)

  return (
    <div className="w-full flex flex-col gap-1">
      <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase px-1 pb-1">
        Race Control
      </p>
      <div className="w-full h-px bg-gray-700 mb-1" />

      {entries.length === 0 ? (
        <div className="flex justify-center items-center min-h-[120px]">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            No messages yet
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map(([key, message]) => {
            const style = getMessageStyle(message)
            return (
              <div
                key={key}
                className={`flex items-start gap-3 rounded-lg border px-3 py-3 ${style.bg} ${style.border}`}
              >
                <span style={{ color: style.iconColor }} className="mt-0.5 shrink-0">
                  {style.icon}
                </span>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-semibold text-gray-100 uppercase leading-snug">
                    {message.Message}
                  </span>
                  <span className="text-xs font-mono text-gray-400">
                    {formatUtc(message.Utc)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
