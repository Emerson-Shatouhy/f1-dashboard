import React from 'react'
import { ConnectionStatus } from '../liveTiming/ConnectionStatus'

export function SessionInfoSkeleton(): React.JSX.Element {
  return (
    <div className="w-full bg-gray-900 border-2 border-gray-700 rounded-lg p-4 animate-pulse">
      <div className="flex flex-row justify-between w-full">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-4">
              <div className="h-6 bg-gray-700 rounded w-48"></div>
              <ConnectionStatus />
            </div>
            <div className="flex flex-row gap-4 items-center">
              <div className="h-4 bg-gray-700 rounded w-24"></div>
              <div className="h-6 w-20 bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 bg-gray-700 rounded-full"></div>
            <div className="h-4 bg-gray-700 rounded w-16"></div>
          </div>
          <div className="h-4 bg-gray-700 rounded w-20"></div>
        </div>
      </div>
    </div>
  )
}
