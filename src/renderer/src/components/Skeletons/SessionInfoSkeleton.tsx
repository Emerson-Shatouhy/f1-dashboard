import React from 'react'

export function SessionInfoSkeleton(): React.JSX.Element {
  return (
    <div className="flex animate-pulse flex-row items-center gap-2.5">
      <div className="h-5 w-8 rounded-sm bg-surface-3" />
      <div className="h-3.5 w-48 rounded bg-surface-3" />
    </div>
  )
}
