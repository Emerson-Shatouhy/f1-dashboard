import React from 'react'
import { TrackMap } from '../components/TrackMap'
import { BroadcastStatusBar } from '../components/Broadcast/BroadcastStatusBar'
import { BroadcastLeaderboard } from '../components/Broadcast/BroadcastLeaderboard'
import { NextSessionCountdown } from '../components/Broadcast/NextSessionCountdown'
import { LatestRaceControlMessage } from '../components/RaceControlMessages/RaceControlTable'
import { SettingsPanel } from '../components/SettingsPanel'
import { ViewSwitcher } from '../components/ViewSwitcher'
import { useSessionInfoStore } from '../stores/sessionInfoStore'

function SessionTitle(): React.JSX.Element | null {
  const sessionInfo = useSessionInfoStore((state) => state.sessionInfo)
  if (!sessionInfo) return null

  return (
    <div className="absolute top-3 left-3 z-10 flex items-baseline gap-2">
      <span className="text-[clamp(14px,2.2vh,24px)] font-semibold text-ink">
        {sessionInfo.Meeting.Name}
      </span>
      <span className="text-[clamp(12px,1.7vh,18px)] text-ink-2">{sessionInfo.Name}</span>
    </div>
  )
}

export function BroadcastView(): React.JSX.Element {
  const hasLiveSession = useSessionInfoStore((state) => state.sessionInfo !== null)

  return (
    <div className="relative flex min-h-0 flex-1 gap-2">
      <div className="absolute top-2 right-2 z-20 flex items-center gap-2">
        <ViewSwitcher />
        <SettingsPanel />
      </div>

      {hasLiveSession ? (
        <>
          <div className="w-[clamp(260px,27vw,520px)] shrink-0">
            <BroadcastLeaderboard />
          </div>
          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-2">
            <SessionTitle />
            <div className="min-h-0 flex-1">
              <TrackMap />
            </div>
            <LatestRaceControlMessage />
            <BroadcastStatusBar />
          </div>
        </>
      ) : (
        <NextSessionCountdown />
      )}
    </div>
  )
}
