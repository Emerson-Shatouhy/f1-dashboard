import React, { useEffect } from 'react'
import { useStoreSubscriptions } from '@renderer/contexts/hooks/useStoreSubscriptions'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import { TrackMap } from '@renderer/components/TrackMap'
import { BufferingOverlay } from '@renderer/components/BufferingOverlay'
import { ProjectorStatusBar } from '@renderer/components/ProjectorStatusBar'
import { ProjectorTimingTable } from '@renderer/components/Projector/ProjectorTimingTable'

export function ProjectorPage(): React.JSX.Element {
  useStoreSubscriptions()

  const setProjectorMode = useNavigationStore((s) => s.setProjectorMode)
  useEffect(() => {
    setProjectorMode(true)
    return () => setProjectorMode(false)
  }, [setProjectorMode])

  return (
    <div className="relative flex h-screen w-full flex-row gap-2 overflow-hidden bg-surface-0 p-2 text-ink">
      <BufferingOverlay />

      {/* Left: timing table */}
      <div className="w-[28%] shrink-0">
        <ProjectorTimingTable />
      </div>

      {/* Right: map + status bar */}
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <div className="min-h-0 flex-1">
          <TrackMap />
        </div>
        <ProjectorStatusBar />
      </div>
    </div>
  )
}
