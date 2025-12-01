import React from 'react'
import { DriverList } from './components/DriverList'
import SessionInfo from './components/SessionInfo'
import { useStoreSubscriptions } from './contexts/hooks/useStoreSubscriptions'
import RaceControlTable from './components/RaceControlMessages/RaceControlTable'
import UpdateNotification from './components/UpdateNotification'
import { TrackMap } from './components/TrackMap'

function App(): React.JSX.Element {
  // Set up all store subscriptions
  useStoreSubscriptions()

  return (
    <div className="flex flex-col w-screen bg-gray-900 text-white flex flex-col items-center justify-center overflow-y-auto">
      <UpdateNotification />
      <SessionInfo />
      <div className="flex flex-row w-full p-4 h-full gap-4">
        <div className="w-1/2">
          <DriverList />
        </div>
        <div className="flex flex-col w-1/2 gap-4">
          <div className="h-[50vh]">
            <TrackMap />
          </div>
          <RaceControlTable />
        </div>
      </div>
    </div>
  )
}

export default App
