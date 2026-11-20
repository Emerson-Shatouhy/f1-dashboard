import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useOnboardStore } from '@renderer/stores/onboardStore'
import { useDriverStore } from '@renderer/stores/driverStore'
import { useSessionInfoStore } from '@renderer/stores/sessionInfoStore'
import { useDelayStore } from '@renderer/stores/delayStore'
import { loadHls, type HlsInstance } from './loadHls'

export default function OnboardPanel(): React.JSX.Element {
  const feeds = useOnboardStore((s) => s.feeds)
  const selected = useOnboardStore((s) => s.selected)
  const select = useOnboardStore((s) => s.select)
  const drivers = useDriverStore((s) => s.Drivers)
  const sessionKey = useSessionInfoStore((s) => s.sessionInfo?.Key ?? null)
  const feedsSessionKey = useOnboardStore((s) => s.feedsSessionKey)
  const licenseUrl = useOnboardStore((s) => s.licenseUrl)
  const loading = useOnboardStore((s) => s.loading)
  const error = useOnboardStore((s) => s.error)
  const attemptedKey = useOnboardStore((s) => s.attemptedKey)
  const autoLoad = useOnboardStore((s) => s.autoLoad)

  const delayEnabled = useDelayStore((s) => s.enabled)
  const delayMs = useDelayStore((s) => s.delayMs)
  const setDelayEnabled = useDelayStore((s) => s.setEnabled)
  const setDelayMs = useDelayStore((s) => s.setDelayMs)

  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<HlsInstance | null>(null)
  const [status, setStatus] = useState('')
  const [syncNote, setSyncNote] = useState('')

  // Find the feeds for the current session automatically. Feeds picked by hand on F1 TV
  // (no session key) are left alone; a failed attempt isn't retried until the session changes.
  const needsFeeds =
    feeds.length === 0 || (feedsSessionKey !== null && feedsSessionKey !== sessionKey)
  useEffect(() => {
    if (sessionKey !== null && needsFeeds && !loading && attemptedKey !== sessionKey) {
      void autoLoad(sessionKey)
    }
  }, [sessionKey, needsFeeds, loading, attemptedKey, autoLoad])

  const driverFeeds = useMemo(
    () =>
      feeds
        .filter((f) => f.racingNumber !== null)
        .sort((a, b) => (a.racingNumber ?? 0) - (b.racingNumber ?? 0)),
    [feeds]
  )

  // Fall back to the first available driver when nothing (or an unknown number) is selected
  const activeFeed = useMemo(
    () => driverFeeds.find((f) => String(f.racingNumber) === selected) ?? driverFeeds[0] ?? null,
    [driverFeeds, selected]
  )
  const activeUrl = activeFeed?.url ?? null
  // Each channel has its own licence; the URL F1 TV gives is for the main feed's channel
  const activeChannel = activeFeed?.channelId ?? null
  const activeLicenseUrl =
    licenseUrl && activeChannel !== null
      ? licenseUrl.replace(/([?&]channelId=)\d+/, `$1${activeChannel}`)
      : licenseUrl

  useEffect(() => {
    const video = videoRef.current
    if (!video || !activeUrl) return
    let hls: HlsInstance | null = null
    let cancelled = false
    setStatus('Loading…')

    loadHls()
      .then((Hls) => {
        if (cancelled) return
        if (!Hls.isSupported()) {
          setStatus('Video not supported')
          return
        }
        // The streams are Widevine-encrypted; without a licence server the picture stays black
        hls = new Hls({
          enableWorker: true,
          // Live streams: start at the live edge, not at 0 (the timeline starts far from 0)
          startPosition: -1,
          ...(activeLicenseUrl
            ? {
                emeEnabled: true,
                drmSystems: { 'com.widevine.alpha': { licenseUrl: activeLicenseUrl } }
              }
            : {})
        })
        hlsRef.current = hls
        hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
          // The encrypted HEVC (cbcs) renditions never decode in this CDM setup (black picture,
          // stuck waiting for a key), so only offer the AVC ones
          const levels = (data as unknown as { levels?: { videoCodec?: string }[] }).levels ?? []
          for (let i = levels.length - 1; i >= 0; i--) {
            if (/^hev|^hvc/.test(levels[i].videoCodec ?? '')) hls?.removeLevel?.(i)
          }
          setStatus('')
          void video.play().catch(() => {})
        })
        // If the player is parked before the buffered range (timeline doesn't start at 0), jump in
        const unstick = (): void => {
          if (video.buffered.length === 0) return
          const start = video.buffered.start(0)
          if (video.currentTime < start - 0.1) {
            const target = hls?.liveSyncPosition ?? start + 0.1
            video.currentTime = Math.max(target, start + 0.1)
          }
        }
        video.addEventListener('loadedmetadata', unstick)
        video.addEventListener('waiting', unstick)
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (!data?.fatal) return
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            // Expired signed URLs show up as 403s; other network errors may recover
            const code = data.response?.code
            if (code === 401 || code === 403 || code === 410) {
              // Signed URLs expire; fetch a fresh set. New URLs arrive via the feeds store,
              // which changes activeUrl and restarts playback.
              const key =
                useSessionInfoStore.getState().sessionInfo?.Key ??
                useOnboardStore.getState().feedsSessionKey
              if (key === null) {
                setStatus(`Stream error ${code}. Pick the session again.`)
              } else {
                setStatus('Stream expired, refreshing…')
                void useOnboardStore
                  .getState()
                  .refreshFeeds(key)
                  .then((started) => {
                    if (!started) setStatus(`Stream error ${code}. Try again in a moment.`)
                  })
              }
            } else {
              setStatus(code ? `Stream error ${code}` : 'Network error…')
              if (!code) hls?.startLoad()
            }
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls?.recoverMediaError()
          } else {
            setStatus(`Playback error: ${data.details}`)
          }
        })
        hls.loadSource(activeUrl)
        hls.attachMedia(video)
      })
      .catch((err: Error) => setStatus(err.message))

    return () => {
      cancelled = true
      if (hlsRef.current === hls) hlsRef.current = null
      hls?.destroy()
    }
  }, [activeUrl, activeLicenseUrl])

  // Match the broadcast delay to how far behind real time the video is. Needs the playlist to
  // carry wall-clock timestamps; otherwise fall back to the nudge buttons.
  const matchVideo = (): void => {
    const playing = hlsRef.current?.playingDate
    if (!playing) {
      setSyncNote('No timestamps in this stream, use − / +')
      return
    }
    const lagMs = Date.now() - playing.getTime()
    const clamped = Math.min(120_000, Math.max(5_000, Math.round(lagMs / 1000) * 1000))
    setDelayMs(clamped)
    setDelayEnabled(true)
    setSyncNote(`Video is ${Math.round(lagMs / 1000)}s behind`)
  }
  const nudge = (deltaMs: number): void => {
    setDelayMs(Math.min(120_000, Math.max(5_000, delayMs + deltaMs)))
    setDelayEnabled(true)
    setSyncNote('')
  }

  if (driverFeeds.length === 0) {
    const message = loading
      ? 'Finding onboard feeds for this session…'
      : sessionKey === null
        ? 'Waiting for session info…'
        : (error ?? 'No onboard feeds for this session yet.')
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-4 text-center text-xs text-ink-3">
        <p>{message}</p>
        {!loading && (
          <div className="flex gap-2">
            {sessionKey !== null && (
              <button
                type="button"
                onClick={() => void autoLoad(sessionKey)}
                className="rounded border border-line-strong px-2 py-1 text-ink-2 hover:bg-surface-2 hover:text-ink"
              >
                Try again
              </button>
            )}
            <button
              type="button"
              onClick={() => void window.api.openF1TvSessionPicker()}
              className="rounded border border-line-strong px-2 py-1 text-ink-2 hover:bg-surface-2 hover:text-ink"
            >
              Pick session on F1 TV
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative min-h-0 flex-1 bg-black">
        <video
          ref={videoRef}
          className="h-full w-full object-contain"
          autoPlay
          playsInline
          controls
        />
        {status && (
          <div className="pointer-events-none absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 text-[11px] text-ink-2">
            {status}
          </div>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-1 border-t border-line px-2 py-1.5">
        {driverFeeds.map((f) => {
          const num = String(f.racingNumber)
          const driver = drivers[num]
          const active = f === activeFeed
          const colour = driver?.TeamColour ? `#${driver.TeamColour}` : 'var(--color-ink-3)'
          return (
            <button
              key={num}
              type="button"
              onClick={() => select(num)}
              title={driver?.FullName ?? f.label}
              className={`rounded px-1.5 py-0.5 text-[11px] font-medium tabular-nums ${
                active ? 'bg-surface-3 text-ink' : 'text-ink-2 hover:bg-surface-2'
              }`}
              style={{ borderBottom: `2px solid ${active ? colour : 'transparent'}` }}
            >
              {driver?.Tla ?? f.label.split(' · ')[0]}
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => void window.api.openF1TvSessionPicker()}
          className="ml-auto rounded px-1.5 py-0.5 text-[11px] text-ink-3 hover:bg-surface-2 hover:text-ink-2"
        >
          Change session
        </button>
      </div>
      <div className="flex shrink-0 items-center gap-1 border-t border-line px-2 py-1 text-[11px] text-ink-3">
        <span>Timing delay</span>
        <span className="tabular-nums text-ink-2">
          {delayEnabled ? `${Math.round(delayMs / 1000)}s` : 'off'}
        </span>
        <button
          type="button"
          onClick={() => nudge(-1000)}
          className="rounded px-1.5 hover:bg-surface-2 hover:text-ink-2"
          title="1 second less delay"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => nudge(1000)}
          className="rounded px-1.5 hover:bg-surface-2 hover:text-ink-2"
          title="1 second more delay"
        >
          +
        </button>
        <button
          type="button"
          onClick={matchVideo}
          className="rounded px-1.5 hover:bg-surface-2 hover:text-ink-2"
        >
          Match video
        </button>
        {syncNote && <span className="ml-auto text-ink-3">{syncNote}</span>}
      </div>
    </div>
  )
}
