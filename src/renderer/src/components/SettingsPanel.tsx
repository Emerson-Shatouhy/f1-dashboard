import React, { useEffect, useRef, useState } from 'react'
import { Settings, RefreshCw, Bug, FileText, X, Wifi, Heart, Tv, Monitor } from 'lucide-react'
import { useHeartbeatStore } from '@renderer/stores/heartbeatStore'
import { useDelayStore } from '@renderer/stores/delayStore'
import { resetAllStores } from '@renderer/utils/resetStores'

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'

interface ClientState {
  status: ConnectionStatus
  debugMode: boolean
  enableLogging: boolean
}

const STATUS_CONFIG: Record<ConnectionStatus, { label: string; dot: string; text: string }> = {
  connected: { label: 'Live', dot: 'bg-green-500', text: 'text-green-400' },
  connecting: { label: 'Connecting', dot: 'bg-yellow-400', text: 'text-yellow-400' },
  disconnected: { label: 'Disconnected', dot: 'bg-red-500', text: 'text-red-400' }
}

export function SettingsPanel(): React.JSX.Element {
  const [state, setState] = useState<ClientState>({
    status: 'connecting',
    debugMode: false,
    enableLogging: false
  })
  const [open, setOpen] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const { Utc, getFormattedUtc } = useHeartbeatStore()

  useEffect(() => {
    window.api.getClientStatus().then(setState).catch(console.error)
  }, [])

  useEffect(() => {
    window.api.onClientStatusUpdate((data) => {
      setState(data)
    })
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent): void => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleReconnect = async (): Promise<void> => {
    setReconnecting(true)
    resetAllStores()
    try {
      await window.api.reconnectF1Client()
    } catch (err) {
      console.error('Reconnect failed:', err)
    } finally {
      setReconnecting(false)
    }
  }

  const handleToggleDebug = async (): Promise<void> => {
    const next = !state.debugMode
    setState((s) => ({ ...s, debugMode: next }))
    resetAllStores()
    await window.api.setDebugMode(next)
  }

  const handleToggleLogging = async (): Promise<void> => {
    const next = !state.enableLogging
    setState((s) => ({ ...s, enableLogging: next }))
    await window.api.setLoggingMode(next)
  }

  const { enabled: delayEnabled, delayMs, setEnabled: setDelayEnabled, setDelayMs } = useDelayStore()

  const displayStatus = reconnecting ? 'connecting' : state.status
  const { dot, text, label } = STATUS_CONFIG[displayStatus]

  return (
    <div className="relative" ref={panelRef}>
      {/* Gear button with subtle status dot */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center w-8 h-8 rounded-full bg-gray-800 border border-gray-700 hover:bg-gray-700 transition-colors cursor-pointer"
        title="Settings"
      >
        <Settings className="w-4 h-4 text-gray-400" />
        <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-gray-900 ${dot}`} />
      </button>

      {/* Settings panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-gray-850 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden"
          style={{ backgroundColor: '#111827' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-white">Settings</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-md hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Connection section */}
          <div className="px-4 pt-3 pb-1">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-2">Connection</p>

            {/* Status row */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2.5">
                <Wifi className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-300">Status</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${dot} ${displayStatus === 'connecting' ? 'animate-pulse' : ''}`} />
                <span className={`text-xs font-medium ${text}`}>{reconnecting ? 'Reconnecting…' : label}</span>
              </div>
            </div>

            {/* Last heartbeat row */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2.5">
                <Heart className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-300">Last Heartbeat</span>
              </div>
              <span className="text-xs font-mono text-gray-400">
                {Utc ? getFormattedUtc() : '—'}
              </span>
            </div>

            {/* Reconnect button */}
            <button
              onClick={handleReconnect}
              disabled={reconnecting}
              className="flex items-center justify-center gap-2 w-full mt-1 mb-3 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-gray-400 ${reconnecting ? 'animate-spin' : ''}`} />
              Reconnect
            </button>
          </div>

          <div className="border-t border-gray-700 mx-4" />

          {/* Display section */}
          <div className="px-4 pt-3 pb-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-2">Display</p>

            {/* Projector window */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2.5">
                <Monitor className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-300">Projector Window</p>
                  <p className="text-[11px] text-gray-500">Open on second screen / projector</p>
                </div>
              </div>
              <button
                onClick={() => window.api.openProjectorWindow()}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-xs text-gray-200 transition-colors cursor-pointer"
              >
                Open
              </button>
            </div>
          </div>

          <div className="border-t border-gray-700 mx-4" />

          {/* TV Sync section */}
          <div className="px-4 pt-3 pb-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-2">TV Sync</p>

            {/* Enable toggle */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2.5">
                <Tv className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-300">Broadcast Delay</p>
                  <p className="text-[11px] text-gray-500">Buffer data to sync with TV</p>
                </div>
              </div>
              <button
                onClick={() => setDelayEnabled(!delayEnabled)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  delayEnabled ? 'bg-red-500' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    delayEnabled ? 'translate-x-4.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Delay slider — shown only when enabled */}
            {delayEnabled && (
              <div className="mt-1 mb-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-gray-400">Delay amount</span>
                  <span className="text-[11px] font-mono text-red-400 font-semibold">
                    {delayMs / 1000}s
                  </span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={120}
                  step={5}
                  value={delayMs / 1000}
                  onChange={(e) => setDelayMs(parseInt(e.target.value, 10) * 1000)}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${((delayMs / 1000 - 5) / 115) * 100}%, #374151 ${((delayMs / 1000 - 5) / 115) * 100}%, #374151 100%)`
                  }}
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-gray-600">5s</span>
                  <span className="text-[10px] text-gray-600">120s</span>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-700 mx-4" />

          {/* Developer section */}
          <div className="px-4 pt-3 pb-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-2">Developer</p>

            {/* Debug mode toggle */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2.5">
                <Bug className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-300">Debug Mode</p>
                  <p className="text-[11px] text-gray-500">Connect to localhost:5001</p>
                </div>
              </div>
              <button
                onClick={handleToggleDebug}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  state.debugMode ? 'bg-orange-500' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    state.debugMode ? 'translate-x-4.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Log messages toggle */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-300">Log Messages</p>
                  <p className="text-[11px] text-gray-500">Write raw feed to /logs</p>
                </div>
              </div>
              <button
                onClick={handleToggleLogging}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  state.enableLogging ? 'bg-blue-500' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    state.enableLogging ? 'translate-x-4.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
