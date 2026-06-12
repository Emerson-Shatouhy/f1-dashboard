import React, { useEffect, useState } from 'react'
import { Tv } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { DriverList } from '../components/DriverList'
import { TrackMap } from '../components/TrackMap'
import { ProjectorStatusBar } from '../components/ProjectorStatusBar'
import { ProjectorCountdown } from '../components/ProjectorCountdown'
import { SettingsPanel } from '../components/SettingsPanel'
import SessionInfo from '../components/SessionInfo'
import RaceControlTable from '../components/RaceControlMessages/RaceControlTable'
import { useSessionInfoStore } from '../stores/sessionInfoStore'
import { useDelayStore } from '../stores/delayStore'
import { useNavigationStore } from '../stores/navigationStore'

function BufferingOverlay(): React.JSX.Element {
  const { countdown, delayMs } = useDelayStore()
  const progress = Math.max(0, Math.min(1, 1 - countdown / (delayMs / 1000)))

  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-gray-950/95 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 max-w-sm text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-800 border border-gray-700">
          <Tv className="w-7 h-7 text-red-400" />
        </div>
        <div>
          <p className="text-white font-semibold text-lg">Syncing with TV broadcast</p>
          <p className="text-gray-400 text-sm mt-1">Buffering {delayMs / 1000}s of data&hellip;</p>
        </div>
        <div className="w-full">
          <div className="flex items-baseline justify-center gap-1 mb-4">
            <span className="text-5xl font-mono font-bold text-red-400 tabular-nums">
              {countdown}
            </span>
            <span className="text-gray-400 text-lg">s</span>
          </div>
          <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500 rounded-full transition-all duration-500"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function RemoteQR(): React.JSX.Element | null {
  const [remoteUrl, setRemoteUrl] = useState<string | null>(null)

  useEffect(() => {
    window.api.getRemoteControlUrl().then(setRemoteUrl).catch(() => {})
  }, [])

  if (!remoteUrl) return null

  return (
    <div className="absolute bottom-3 right-3 z-50 flex flex-col items-center gap-1.5 bg-white/90 rounded-xl p-2.5 shadow-lg">
      <QRCodeSVG value={remoteUrl} size={72} />
      <span className="text-[9px] font-mono text-gray-600 text-center leading-tight max-w-[80px] break-all">
        {remoteUrl.replace(/^https?:\/\//, '')}
      </span>
    </div>
  )
}

export function LivePage(): React.JSX.Element {
  const sessionInfo = useSessionInfoStore((s) => s.sessionInfo)
  const isBuffering = useDelayStore((s) => s.isBuffering)
  const projectorMode = useNavigationStore((s) => s.projectorMode)
  const hasLiveSession = sessionInfo !== null

  // Projector mode: fullscreen countdown between sessions, minimal layout during session
  if (projectorMode) {
    return (
      <div className="flex flex-row w-full h-screen bg-gray-950 p-3 gap-3 relative overflow-hidden">
        {isBuffering && <BufferingOverlay />}
        <div className="absolute top-3 left-3 z-50">
          <SettingsPanel />
        </div>
        <RemoteQR />

        {hasLiveSession ? (
          <>
            <div className="w-[45%] overflow-auto">
              <DriverList />
            </div>
            <div className="flex flex-col flex-1 min-h-0 gap-2">
              <div className="flex-1 min-h-0">
                <TrackMap />
              </div>
              <ProjectorStatusBar />
            </div>
          </>
        ) : (
          <div className="flex flex-1 min-h-0">
            <ProjectorCountdown />
          </div>
        )}
      </div>
    )
  }

  // Normal mode: full dashboard always visible
  return (
    <div className="flex flex-col w-full h-screen bg-gray-950 p-3 gap-3 relative overflow-hidden">
      {isBuffering && <BufferingOverlay />}
      <RemoteQR />

      <SessionInfo />

      <div className="flex flex-row flex-1 min-h-0 gap-3">
        <div className="w-[45%] overflow-auto">
          <DriverList />
        </div>
        <div className="flex flex-col flex-1 min-h-0 gap-3">
          <div className="flex-1 min-h-0">
            <TrackMap />
          </div>
          <div className="overflow-auto">
            <RaceControlTable />
          </div>
        </div>
      </div>
    </div>
  )
}
