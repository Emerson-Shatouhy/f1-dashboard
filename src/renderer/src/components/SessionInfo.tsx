import React from 'react'
import { TrackStatusIndicator } from './badges/TrackStatusIndicator'
import { useLapCountStore } from '@renderer/stores/lapCountStore'
import { useSessionInfoStore } from '@renderer/stores/sessionInfoStore'
import { useCountdownTimer } from '@renderer/hooks/useCountdownTimer'
import WeatherInfo from './WeatherInfo'
import { SessionInfoSkeleton } from './Skeletons/SessionInfoSkeleton'

export default function SessionInfo(): React.JSX.Element {
  const sessionInfo = useSessionInfoStore((state) => state.sessionInfo)
  const { CurrentLap, TotalLaps } = useLapCountStore()
  const countdownTime = useCountdownTimer()

  if (!sessionInfo) {
    return <SessionInfoSkeleton />
  }

  const { Meeting, Name } = sessionInfo

  return (
    <div className="flex flex-row justify-between w-full bg-gray-900 border-2 border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-row items-center gap-4">
          <img
            src={`https://f1-dash.com/country-flags/${Meeting.Country.Code.toLowerCase()}.svg`}
            alt={`${Meeting.Location} flag`}
            className="h-8 sm:h-10 lg:h-12 xl:h-16 w-auto object-cover rounded"
          />
          <div className="flex flex-col gap-1">
            <h1 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-semibold text-gray-300 uppercase tracking-wider flex flex-row items-center gap-4">
              {Meeting.Name} {' - '}
              {Name}
            </h1>
            <h2 className="flex flex-row justify-between text-base sm:text-lg lg:text-xl xl:text-2xl font-semibold text-gray-400 uppercase tracking-wider flex flex-row gap-2 items-center">
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
      </div>
      <div className="flex flex-row gap-4 items-center">
        <WeatherInfo />
      </div>
    </div>
  )
}
