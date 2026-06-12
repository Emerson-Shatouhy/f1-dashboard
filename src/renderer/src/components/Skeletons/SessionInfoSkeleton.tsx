import React from 'react'
import { SettingsPanel } from '../SettingsPanel'

export function SessionInfoSkeleton(): React.JSX.Element {
  return (
    <div className="flex flex-row justify-between items-center w-full bg-gray-900 border-2 border-gray-700 rounded-lg px-5 py-3 animate-pulse">
      <div className="flex flex-row items-center gap-4">
        <div className="h-10 w-14 bg-gray-700 rounded" />
        <div className="flex flex-col gap-2">
          <div className="h-5 bg-gray-700 rounded w-48" />
          <div className="flex flex-row items-center gap-2">
            <div className="h-3.5 bg-gray-700 rounded w-32" />
            <div className="h-5 bg-gray-700 rounded-full w-16" />
          </div>
        </div>
      </div>
      <div className="flex flex-row items-center gap-3">
        <div className="h-8 bg-gray-700 rounded-full w-32" />
        <div className="h-8 bg-gray-700 rounded-full w-24" />
        <SettingsPanel />
      </div>
    </div>
  )
}
