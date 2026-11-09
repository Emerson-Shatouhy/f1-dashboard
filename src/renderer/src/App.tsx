import React, { useEffect } from 'react'
import { useStoreSubscriptions } from './contexts/hooks/useStoreSubscriptions'
import UpdateNotification from './components/UpdateNotification'
import { BufferingOverlay } from './components/BufferingOverlay'
import { PitWallView } from './pages/PitWallView'

function App(): React.JSX.Element {
  // Set up all store subscriptions
  useStoreSubscriptions()

  // Started from here, not the main process, so the store subscriptions above are attached
  // before the feed's initial snapshot arrives
  useEffect(() => {
    window.api.startF1Client().catch(console.error)
  }, [])

  return (
    <div className="relative flex h-screen w-screen flex-col gap-2 overflow-hidden bg-surface-0 p-2 text-ink">
      <UpdateNotification />
      <BufferingOverlay />
      <PitWallView />
    </div>
  )
}

export default App
