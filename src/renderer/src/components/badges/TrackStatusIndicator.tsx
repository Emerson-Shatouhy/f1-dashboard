import React from 'react'
import { useTrackStatusStore } from '@renderer/stores/trackStatusStore'

/**
 * Status codes:
 * 1 - AllClear
 * 2 - Yellow
 * 3 - Unknown
 * 4 - SCDeployed
 * 5 - Red
 * 6 - VSCDeployed
 * 7 - VSCEnding
 **/
export function TrackStatusIndicator(): React.JSX.Element {
  const trackStatus = useTrackStatusStore((state) => state.trackStatus)

  const getStatusStyles = (status: string): { borderColor: string; textColor: string } => {
    switch (status) {
      case '1':
        return { borderColor: 'border-green-500', textColor: 'text-green-500' } // AllClear
      case '2':
        return { borderColor: 'border-yellow-500', textColor: 'text-yellow-500' } // Yellow
      case '3':
        return { borderColor: 'border-gray-500', textColor: 'text-gray-500' } // Unknown
      case '4':
        return { borderColor: 'border-blue-500', textColor: 'text-blue-500' } // SCDeployed
      case '5':
        return { borderColor: 'border-red-500', textColor: 'text-red-500' } // Red
      case '6':
        return { borderColor: 'border-purple-500', textColor: 'text-purple-500' } // VSCDeployed
      case '7':
        return { borderColor: 'border-amber-500', textColor: 'text-amber-500' } // VSCEnding
      default:
        return { borderColor: 'border-gray-300', textColor: 'text-gray-300' } // Default
    }
  }

  const getMessage = (status: string): string => {
    switch (status) {
      case '1':
        return 'Clear'
      case '2':
        return 'Yellow Flag'
      case '3':
        return 'Unknown Status'
      case '4':
        return 'Safety Car Deployed'
      case '5':
        return 'Red Flag'
      case '6':
        return 'Virtual Safety Car Deployed'
      case '7':
        return 'Virtual Safety Car Ending'
      default:
        return 'Unknown Status'
    }
  }

  const getDotColor = (status: string): string => {
    switch (status) {
      case '1': return 'bg-green-500'
      case '2': return 'bg-yellow-500'
      case '3': return 'bg-gray-500'
      case '4': return 'bg-blue-500'
      case '5': return 'bg-red-500'
      case '6': return 'bg-purple-500'
      case '7': return 'bg-amber-500'
      default: return 'bg-gray-500'
    }
  }

  const getPulseClass = (status: string): string => {
    // Urgent statuses pulse faster
    if (status === '5') return 'animate-[pulse_0.75s_ease-in-out_infinite]' // Red flag
    if (status === '2' || status === '6' || status === '7') return 'animate-[pulse_1s_ease-in-out_infinite]' // Yellow / VSC
    return 'animate-pulse' // Default slow pulse for all others
  }

  const getBgAndBorder = (status: string): { bg: string; border: string } => {
    switch (status) {
      case '1': return { bg: 'bg-green-500/10', border: 'border-green-500/30' }
      case '2': return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' }
      case '3': return { bg: 'bg-gray-500/10', border: 'border-gray-500/30' }
      case '4': return { bg: 'bg-blue-500/10', border: 'border-blue-500/30' }
      case '5': return { bg: 'bg-red-500/10', border: 'border-red-500/30' }
      case '6': return { bg: 'bg-purple-500/10', border: 'border-purple-500/30' }
      case '7': return { bg: 'bg-amber-500/10', border: 'border-amber-500/30' }
      default:  return { bg: 'bg-gray-800', border: 'border-gray-700' }
    }
  }

  const { textColor } = getStatusStyles(trackStatus?.Status || '0')
  const dotColor = getDotColor(trackStatus?.Status || '0')
  const pulseClass = getPulseClass(trackStatus?.Status || '0')
  const { bg, border } = getBgAndBorder(trackStatus?.Status || '0')

  return (
    <div
      className={`flex items-center gap-2 ${bg} border ${border} rounded-full px-4 py-1.5 ${textColor} font-semibold text-sm uppercase tracking-wide transition-colors duration-500`}
    >
      <span className={`w-2 h-2 rounded-full ${dotColor} ${pulseClass}`} />
      {getMessage(trackStatus?.Status || '0')}
    </div>
  )
}
