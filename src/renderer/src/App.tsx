import React from 'react'
import { DriverList } from './components/DriverList'
import SessionInfo from './components/SessionInfo'
import { useStoreSubscriptions } from './contexts/hooks/useStoreSubscriptions'
import RaceControlTable from './components/RaceControlMessages/RaceControlTable'

function App(): React.JSX.Element {
  // Set up all store subscriptions
  useStoreSubscriptions()

  return (
    <div className="flex flex-col w-screen bg-gray-900 text-white flex flex-col items-center justify-center overflow-y-auto">
      <SessionInfo />
      <div className="flex flex-row justify-ends w-full p-4">
        <DriverList />
        <RaceControlTable />
      </div>
    </div>
  )
}

export default App
