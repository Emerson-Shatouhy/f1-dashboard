import React from 'react'

interface DriverTableSkeletonProps {
  rows?: number
}

export function DriverTableSkeleton({ rows = 20 }: DriverTableSkeletonProps): React.JSX.Element {
  return (
    <div className="flex h-full w-full animate-pulse flex-col gap-1 overflow-hidden rounded-md bg-surface-1 p-2">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="min-h-0 flex-1 rounded-sm bg-surface-2" />
      ))}
    </div>
  )
}
