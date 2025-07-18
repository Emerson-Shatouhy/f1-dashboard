import React from 'react'
import { ConnectionStatus } from './liveTiming/ConnectionStatus'
import { TrackStatusIndicator } from './badges/TrackStatusIndicator'
import { useLapCountStore } from '@renderer/stores/lapCountStore'
import { useSessionInfoStore } from '@renderer/stores/sessionInfoStore'
import { useCountdownTimer } from '@renderer/hooks/useCountdownTimer'
import WeatherInfo from './WeatherInfo'

export default function SessionInfo(): React.JSX.Element {
  const sessionInfo = useSessionInfoStore((state) => state.sessionInfo)
  const { CurrentLap, TotalLaps } = useLapCountStore()
  const countdownTime = useCountdownTimer()

  if (!sessionInfo) {
    return (
      <div className="w-full bg-gray-800 p-4">
        <ConnectionStatus />
        <div className="text-gray-400">Waiting for session data...</div>
      </div>
    )
  }

  const { Meeting, Name } = sessionInfo

  return (
    <div className="flex flex-row justify-between w-full bg-gray-800 p-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold flex flex-row items-center gap-4">
            {Meeting.Name} {' - '}
            {Name}
            <ConnectionStatus />
          </h1>
          <h2 className="flex flex-row justify-between text-xl text-gray-300 flex flex-row gap-2 items-center">
            {sessionInfo.Type === 'Race' ? (
              <>
                Lap {CurrentLap} / {TotalLaps}
              </>
            ) : (
              <>{countdownTime}</>
            )}

            <TrackStatusIndicator />
          </h2>
        </div>
      </div>
      <WeatherInfo />
    </div>
  )
}
