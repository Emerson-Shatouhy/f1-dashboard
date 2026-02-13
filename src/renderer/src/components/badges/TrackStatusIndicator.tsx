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

  const { borderColor, textColor } = getStatusStyles(trackStatus?.Status || '0')

  return (
    <div className="flex flex-col items-center justify-center">
      <div
        className={`w-auto h-full py-1 px-2 sm:px-3 lg:px-4 border-2 ${borderColor} rounded-full flex items-center justify-center ${textColor} text-xs sm:text-sm lg:text-base xl:text-lg font-semibold`}
      >
        {getMessage(trackStatus?.Status || '0')}
      </div>
    </div>
  )
}
