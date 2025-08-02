import React, { useEffect } from 'react'

export function ConnectionStatus(): React.JSX.Element {
  const [isConnecting, setIsConnecting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  useEffect(() => {
    const startF1Client = async (): Promise<void> => {
      setIsConnecting(true)
      setError(null)
      try {
        await window.electron.ipcRenderer.invoke('start-f1-client')
        console.log('F1 client started successfully')
      } catch (err) {
        console.error('Failed to start F1 client:', err)
        setError('Failed to connect to F1 live timing. Will retry automatically...')
        // Retry after 5 seconds
        setTimeout(startF1Client, 5000)
      } finally {
        setIsConnecting(false)
      }
    }

    startF1Client()

    // Cleanup on unmount
    return () => {
      setIsConnecting(false)
      setError(null)
    }
  }, [])

  // Determine the status circle color based on connection state
  const getStatusCircleClass = (): string => {
    if (isConnecting) return 'bg-yellow-400' // Yellow for connecting
    if (error) return 'bg-red-500' // Red for error
    return 'bg-green-500' // Green for connected
  }

  return (
    <div className="flex items-center gap-3 mb-2 justify-center">
      <div
        className={`w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 rounded-full ${getStatusCircleClass()} animate-pulse`}
      ></div>
      {error && <span className="text-red-500 text-xs sm:text-sm lg:text-base">{error}</span>}
    </div>
  )
}
