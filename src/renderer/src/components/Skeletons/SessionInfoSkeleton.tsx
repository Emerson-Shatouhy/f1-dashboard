import React from 'react'
import { SettingsPanel } from '../SettingsPanel'
import { ViewSwitcher } from '../ViewSwitcher'

export function SessionInfoSkeleton(): React.JSX.Element {
  return (
    <div className="flex h-12 w-full shrink-0 flex-row items-center justify-between gap-4 rounded-md border-t-2 border-line bg-surface-1 px-3">
      <div className="flex animate-pulse flex-row items-center gap-2.5">
        <div className="h-5 w-8 rounded-sm bg-surface-3" />
        <div className="h-3.5 w-48 rounded bg-surface-3" />
      </div>
      <div className="flex flex-row items-center gap-3">
        <ViewSwitcher />
        <SettingsPanel />
      </div>
    </div>
  )
}
