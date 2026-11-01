import React from 'react'
import { useStoreSubscriptions } from './contexts/hooks/useStoreSubscriptions'
import UpdateNotification from './components/UpdateNotification'
import { BufferingOverlay } from './components/BufferingOverlay'
import { useNavigationStore } from './stores/navigationStore'
import { PitWallView } from './pages/PitWallView'
import { BroadcastView } from './pages/BroadcastView'

function App(): React.JSX.Element {
  // Set up all store subscriptions
  useStoreSubscriptions()
  const view = useNavigationStore((state) => state.view)

  return (
    <div className="relative flex h-screen w-screen flex-col gap-2 overflow-hidden bg-surface-0 p-2 text-ink">
      <UpdateNotification />
      <BufferingOverlay />
      {view === 'broadcast' ? <BroadcastView /> : <PitWallView />}
    </div>
  )
}

export default App
