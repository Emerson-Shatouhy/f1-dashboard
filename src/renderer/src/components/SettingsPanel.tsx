import React, { useEffect, useRef, useState } from 'react'
import { Settings, RefreshCw, Bug, FileText, X, Wifi, Heart, Tv, Monitor, Download, Smartphone } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
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
  connected: { label: 'Live', dot: 'bg-flag-clear', text: 'text-flag-clear' },
  connecting: { label: 'Connecting', dot: 'bg-flag-yellow', text: 'text-flag-yellow' },
  disconnected: { label: 'Disconnected', dot: 'bg-flag-red', text: 'text-danger' }
}

export function SettingsPanel(): React.JSX.Element {
  const [state, setState] = useState<ClientState>({
    status: 'connecting',
    debugMode: false,
    enableLogging: false
  })
  const [open, setOpen] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'up-to-date'>('idle')
  const [remoteUrl, setRemoteUrl] = useState<string | null>(null)
  const [showRemoteQr, setShowRemoteQr] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const { Utc, getFormattedUtc } = useHeartbeatStore()

  useEffect(() => {
    window.api.getClientStatus().then(setState).catch(console.error)
    window.api.getRemoteControlUrl().then(setRemoteUrl).catch(console.error)
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

  useEffect(() => {
    window.api.onUpdateChecking(() => setUpdateStatus('checking'))
    window.api.onUpdateAvailable(() => setUpdateStatus('downloading'))
    window.api.onUpdateNotAvailable(() => setUpdateStatus('up-to-date'))
    window.api.onUpdateDownloaded(() => setUpdateStatus('ready'))
    window.api.onUpdateError(() => setUpdateStatus('idle'))
  }, [])

  const handleCheckForUpdates = async (): Promise<void> => {
    setUpdateStatus('checking')
    await window.api.checkForUpdates()
  }

  const handleRestartAndUpdate = (): void => {
    window.api.restartAndUpdate()
  }

  const { enabled: delayEnabled, delayMs, setEnabled: setDelayEnabled, setDelayMs } = useDelayStore()

  const displayStatus = reconnecting ? 'connecting' : state.status
  const { dot, text, label } = STATUS_CONFIG[displayStatus]

  return (
    <div className="relative" ref={panelRef}>
      {/* Gear button with subtle status dot */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center w-7 h-7 rounded-md bg-surface-2 hover:bg-surface-3 transition-colors cursor-pointer"
        title="Settings"
      >
        <Settings className="w-4 h-4 text-ink-2" />
        <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-surface-1 ${dot}`} />
      </button>

      {/* Settings panel */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 max-h-[calc(100vh-5rem)] w-72 overflow-y-auto rounded-md border border-line-strong bg-surface-1 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-ink-2" />
              <span className="text-sm font-semibold text-ink">Settings</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-md hover:bg-surface-3 transition-colors text-ink-2 hover:text-ink"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Connection section */}
          <div className="px-4 pt-3 pb-1">
            <p className="text-[11px] text-ink-3 font-medium mb-2">Connection</p>

            {/* Status row */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2.5">
                <Wifi className="w-4 h-4 text-ink-2" />
                <span className="text-sm text-ink">Status</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${dot} ${displayStatus === 'connecting' ? 'animate-pulse' : ''}`} />
                <span className={`text-xs font-medium ${text}`}>{reconnecting ? 'Reconnecting…' : label}</span>
              </div>
            </div>

            {/* Last heartbeat row */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2.5">
                <Heart className="w-4 h-4 text-ink-2" />
                <span className="text-sm text-ink">Last Heartbeat</span>
              </div>
              <span className="text-xs tabular-nums text-ink-2">
                {Utc ? getFormattedUtc() : '—'}
              </span>
            </div>

            {/* Reconnect button */}
            <button
              onClick={handleReconnect}
              disabled={reconnecting}
              className="flex items-center justify-center gap-2 w-full mt-1 mb-3 px-3 py-2 bg-surface-2 hover:bg-surface-3 border border-line rounded-lg text-sm text-ink transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-ink-2 ${reconnecting ? 'animate-spin' : ''}`} />
              Reconnect
            </button>
          </div>

          <div className="border-t border-line mx-4" />

          {/* Display section */}
          <div className="px-4 pt-3 pb-3">
            <p className="text-[11px] text-ink-3 font-medium mb-2">Display</p>

            {/* Projector window */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2.5">
                <Monitor className="w-4 h-4 text-ink-2" />
                <div>
                  <p className="text-sm text-ink">Projector Window</p>
                  <p className="text-[11px] text-ink-3">Open on second screen / projector</p>
                </div>
              </div>
              <button
                onClick={() => window.api.openProjectorWindow()}
                className="px-3 py-1.5 bg-surface-2 hover:bg-surface-3 border border-line rounded-lg text-xs text-ink transition-colors cursor-pointer"
              >
                Open
              </button>
            </div>

            {/* Remote control */}
            {remoteUrl && (
              <>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Smartphone className="w-4 h-4 text-ink-2 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-ink">Remote Control</p>
                      <p className="text-[11px] text-ink-3 truncate">
                        {remoteUrl.replace(/^https?:\/\//, '')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowRemoteQr((v) => !v)}
                    className="px-3 py-1.5 bg-surface-2 hover:bg-surface-3 border border-line rounded-lg text-xs text-ink transition-colors cursor-pointer"
                  >
                    {showRemoteQr ? 'Hide' : 'QR'}
                  </button>
                </div>
                {showRemoteQr && (
                  <div className="flex justify-center rounded-md bg-white p-3">
                    <QRCodeSVG value={remoteUrl} size={120} />
                  </div>
                )}
              </>
            )}
          </div>

          <div className="border-t border-line mx-4" />

          {/* TV Sync section */}
          <div className="px-4 pt-3 pb-3">
            <p className="text-[11px] text-ink-3 font-medium mb-2">TV Sync</p>

            {/* Enable toggle */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2.5">
                <Tv className="w-4 h-4 text-ink-2" />
                <div>
                  <p className="text-sm text-ink">Broadcast Delay</p>
                  <p className="text-[11px] text-ink-3">Buffer data to sync with TV</p>
                </div>
              </div>
              <button
                onClick={() => setDelayEnabled(!delayEnabled)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  delayEnabled ? 'bg-flag-red' : 'bg-surface-3'
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
                  <span className="text-[11px] text-ink-2">Delay amount</span>
                  <span className="text-[11px] tabular-nums text-danger font-semibold">
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
                    background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${((delayMs / 1000 - 5) / 115) * 100}%, var(--color-surface-3) ${((delayMs / 1000 - 5) / 115) * 100}%, var(--color-surface-3) 100%)`
                  }}
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-ink-3">5s</span>
                  <span className="text-[10px] text-ink-3">120s</span>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-line mx-4" />

          {/* Developer section */}
          <div className="px-4 pt-3 pb-4">
            <p className="text-[11px] text-ink-3 font-medium mb-2">Developer</p>

            {/* Debug mode toggle */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2.5">
                <Bug className="w-4 h-4 text-ink-2" />
                <div>
                  <p className="text-sm text-ink">Debug Mode</p>
                  <p className="text-[11px] text-ink-3">Connect to localhost:5001</p>
                </div>
              </div>
              <button
                onClick={handleToggleDebug}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  state.debugMode ? 'bg-orange-500' : 'bg-surface-3'
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
                <FileText className="w-4 h-4 text-ink-2" />
                <div>
                  <p className="text-sm text-ink">Log Messages</p>
                  <p className="text-[11px] text-ink-3">Write raw feed to /logs</p>
                </div>
              </div>
              <button
                onClick={handleToggleLogging}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  state.enableLogging ? 'bg-blue-500' : 'bg-surface-3'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    state.enableLogging ? 'translate-x-4.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Check for updates */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2.5">
                <Download className="w-4 h-4 text-ink-2" />
                <div>
                  <p className="text-sm text-ink">Updates</p>
                  <p className="text-[11px] text-ink-3">
                    {updateStatus === 'checking' && 'Checking…'}
                    {updateStatus === 'downloading' && 'Downloading…'}
                    {updateStatus === 'ready' && 'Ready to install'}
                    {updateStatus === 'up-to-date' && 'Up to date'}
                    {(updateStatus === 'idle') && 'Check for a new version'}
                  </p>
                </div>
              </div>
              {updateStatus === 'ready' ? (
                <button
                  onClick={handleRestartAndUpdate}
                  className="px-3 py-1.5 bg-green-700 hover:bg-green-600 border border-green-600 rounded-lg text-xs text-ink transition-colors cursor-pointer"
                >
                  Restart
                </button>
              ) : (
                <button
                  onClick={handleCheckForUpdates}
                  disabled={updateStatus === 'checking' || updateStatus === 'downloading'}
                  className="px-3 py-1.5 bg-surface-2 hover:bg-surface-3 border border-line rounded-lg text-xs text-ink transition-colors cursor-pointer disabled:opacity-50"
                >
                  {updateStatus === 'checking' ? 'Checking…' : updateStatus === 'downloading' ? 'Downloading…' : 'Check'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
