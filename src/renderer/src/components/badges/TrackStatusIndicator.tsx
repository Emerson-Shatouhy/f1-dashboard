import React from 'react'
import { TrackStatus } from '@renderer/types/liveTimingTypes'

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
  const [trackStatus, setTrackStatus] = React.useState<TrackStatus>({
    Status: '0',
    Message: 'Unknown',
    _kf: false
  })

  React.useEffect(() => {
    // Subscribe to track status updates from the F1 live client
    window.api.onTrackStatusUpdate((data: TrackStatus) => {
      setTrackStatus(data)
    })
  }, [])

  const getTrackStatusColor = (status: string): string => {
    switch (status) {
      case '1':
        return 'green-500' // AllClear
      case '2':
        return 'yellow-500' // Yellow
      case '3':
        return 'gray-500' // Unknown
      case '4':
        return 'blue-500' // SCDeployed
      case '5':
        return 'red-500' // Red
      case '6':
        return 'purple-500' // VSCDeployed
      case '7':
        return 'amber-500' // VSCEnding (changed from orange to amber for Tailwind)
      default:
        return 'gray-300' // Default color for unknown status
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
  const statusColor = getTrackStatusColor(trackStatus.Status)

  return (
    <div className="flex flex-col items-center justify-center">
      <div
        className={`w-auto h-full py-1 px-3 border-2 border-${statusColor} rounded-full flex items-center justify-center text-${statusColor} text-sm font-semibold`}
      >
        {getMessage(trackStatus.Status)}
      </div>
    </div>
  )
}
