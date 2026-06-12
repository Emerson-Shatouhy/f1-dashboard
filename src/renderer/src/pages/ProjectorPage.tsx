import React, { useEffect } from 'react'
import { useStoreSubscriptions } from '@renderer/contexts/hooks/useStoreSubscriptions'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import { TrackMap } from '@renderer/components/TrackMap'
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
    <div className="flex flex-row w-full h-screen bg-gray-950 p-3 gap-3 overflow-hidden">
      {/* Left: timing table */}
      <div className="w-[28%] flex-shrink-0 overflow-y-auto overflow-x-hidden">
        <ProjectorTimingTable />
      </div>

      {/* Right: map + status bar */}
      <div className="flex flex-col flex-1 min-h-0 gap-3">
        <div className="flex-1 min-h-0">
          <TrackMap />
        </div>
        <div className="flex-shrink-0">
          <ProjectorStatusBar />
        </div>
      </div>
    </div>
  )
}
