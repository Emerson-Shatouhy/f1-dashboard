import React from 'react'
import { DriverList } from '../components/DriverList'
import { TrackMap } from '../components/TrackMap'
import SessionInfo from '../components/SessionInfo'
import RaceControlTable from '../components/RaceControlMessages/RaceControlTable'

export function PitWallView(): React.JSX.Element {
  return (
    <>
      <SessionInfo />
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,58fr)_minmax(0,42fr)] gap-2">
        <div className="min-h-0">
          <DriverList />
        </div>
        <div className="grid min-h-0 grid-rows-[minmax(0,1.6fr)_minmax(0,1fr)] gap-2">
          <div className="min-h-0">
            <TrackMap />
          </div>
          <div className="min-h-0">
            <RaceControlTable />
          </div>
        </div>
      </div>
    </>
  )
}
