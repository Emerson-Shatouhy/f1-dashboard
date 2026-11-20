import { app, BrowserWindow, ipcMain } from 'electron'
import * as electron from 'electron'
import * as fs from 'fs'
import { fetchPlayBody } from './f1tvAuto'
import { join } from 'path'

// Spike: F1 TV onboard video needs Widevine DRM. Stock Electron has no CDM, so this
// only works on the castlabs "Electron for Content Security" build (version ends in +wvcus),
// which adds `components`. Accessed loosely so the code still typechecks on stock Electron.
interface WidevineComponents {
  whenReady: () => Promise<unknown>
  status: () => unknown
}
const components = (electron as unknown as { components?: WidevineComponents }).components

const F1TV_URL = 'https://f1tv.formula1.com/'

let playerWindow: BrowserWindow | null = null

// --- Driver cam -------------------------------------------------------------------------
// One F1 TV CONTENT/PLAY response lists every feed (world feed, data, tracker and a feed per
// driver onboard) as a signed HLS URL. We keep the latest set and play any of them in our own
// window with hls.js.

export interface CamFeed {
  label: string // "VER · 3" for drivers, channel name otherwise
  racingNumber: number | null // matches the timing feed's driver numbers; null for non-driver channels
  url: string
  channelId: number | null
}

const CHANNEL_NAMES: Record<number, string> = {
  1033: 'F1 LIVE',
  1025: 'INTERNATIONAL',
  1003: 'TRACKER',
  1004: 'DATA'
}

let feeds: CamFeed[] = []
let camWindow: BrowserWindow | null = null
let dashboardWindow: BrowserWindow | null = null
let openCamAfterCapture = false
let feedsSessionKey: number | null = null
// Widevine licence server for the current feeds, and the headers F1 TV expects on that call
let licenseUrl: string | null = null
let licenseHeaders: Record<string, string> = {}

/** Headers to add to Widevine licence requests (applied by the dashboard session's request hook). */
export function getLicenseHeaders(): Record<string, string> {
  return licenseHeaders
}

function parseFeeds(body: string): CamFeed[] {
  const parsed = JSON.parse(body)
  const raw: {
    metadata: string | { channel_id?: number; racing_number?: number }
    url: string
    audio_track_names?: { tea?: string }
  }[] = parsed?.resultObj?.tme?.feeds ?? []
  const list: CamFeed[] = raw.map((f) => {
    const md = typeof f.metadata === 'string' ? JSON.parse(f.metadata) : f.metadata
    const tla = f.audio_track_names?.tea
    const label = md.racing_number
      ? `${tla ?? '?'} · ${md.racing_number}`
      : (CHANNEL_NAMES[md.channel_id ?? 0] ?? `Channel ${md.channel_id}`)
    return {
      label,
      racingNumber: (md.racing_number as number | undefined) ?? null,
      url: f.url,
      channelId: (md.channel_id as number | undefined) ?? null
    }
  })
  // Drivers first (by number), then the non-driver channels
  return list.sort((a, b) => (a.racingNumber ?? Infinity) - (b.racingNumber ?? Infinity))
}

function announceFeeds(): void {
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    dashboardWindow.webContents.send('f1tv-feeds-update', {
      feeds,
      sessionKey: feedsSessionKey,
      licenseUrl
    })
  }
}

/** Store a PLAY response's feeds. `sessionKey` is known for auto-loads, null for manual picks. */
function applyPlayBody(
  body: string,
  sessionKey: number | null,
  headers: Record<string, string> = {}
): boolean {
  try {
    const list = parseFeeds(body)
    if (list.length === 0) return false
    const obj = JSON.parse(body)?.resultObj
    licenseUrl = typeof obj?.laURL === 'string' ? obj.laURL : null
    licenseHeaders = {
      ...(typeof obj?.entitlementToken === 'string'
        ? { entitlementToken: obj.entitlementToken }
        : {}),
      ...headers
    }
    feeds = list
    feedsSessionKey = sessionKey
    console.log(`[F1TV] captured ${feeds.length} feeds`)
    announceFeeds()
    return true
  } catch (err) {
    console.warn('[F1TV] could not parse PLAY response:', err)
    return false
  }
}

/** A PLAY response seen in the visible F1 TV window (manual pick). */
function handlePlayResponse(body: string): void {
  if (!applyPlayBody(body, null)) return
  // The F1 TV window has done its job; close it (login persists), bring the dashboard back,
  // and pop out the standalone cam only if that's what the user asked for
  setTimeout(() => {
    if (playerWindow && !playerWindow.isDestroyed()) playerWindow.close()
    if (dashboardWindow && !dashboardWindow.isDestroyed()) dashboardWindow.focus()
    if (openCamAfterCapture) openCamWindow()
    openCamAfterCapture = false
  }, 300)
}

function openCamWindow(wantedTla = 'VER'): void {
  if (feeds.length === 0) return
  if (camWindow && !camWindow.isDestroyed()) {
    void camWindow.webContents.executeJavaScript(
      `window.initCam(${JSON.stringify(feeds)}, ${JSON.stringify(wantedTla)})`,
      true
    )
    camWindow.focus()
    return
  }

  camWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    title: 'Driver cam (spike)',
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    webPreferences: {
      partition: 'persist:f1tv-cam',
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: false // the CDN has no CORS headers for our file:// origin
    }
  })

  // The CDN expects the F1 TV origin on playlist/segment requests
  camWindow.webContents.session.webRequest.onBeforeSendHeaders(
    { urls: ['https://*.formula1.com/*'] },
    (details, callback) => {
      callback({
        requestHeaders: {
          ...details.requestHeaders,
          Origin: 'https://f1tv.formula1.com',
          Referer: 'https://f1tv.formula1.com/'
        }
      })
    }
  )

  camWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.includes('pick-session')) openF1TvPlayer()
    return { action: 'deny' }
  })
  camWindow.webContents.on('console-message', (_e, _level, message) => {
    if (message.startsWith('[cam]')) console.log(message)
  })
  camWindow.on('closed', () => {
    camWindow = null
  })

  const win = camWindow
  win.webContents.once('did-finish-load', async () => {
    const hlsSource = fs.readFileSync(
      join(app.getAppPath(), 'resources', 'vendor', 'hls.min.js'),
      'utf-8'
    )
    await win.webContents.executeJavaScript(hlsSource, true)
    await win.webContents.executeJavaScript(
      `window.initCam(${JSON.stringify(feeds)}, ${JSON.stringify(wantedTla)})`,
      true
    )
  })
  void win.loadFile(join(app.getAppPath(), 'resources', 'driverCam.html'))
}

/** Cmd/Ctrl+Shift+V: pop out the driver cam, or the F1 TV window first if no feeds are known yet. */
export function openDriverCam(): void {
  if (feeds.length > 0) {
    openCamWindow()
  } else {
    openCamAfterCapture = true
    openF1TvPlayer()
  }
}

/** Wire the dashboard window to the F1 TV feeds (called once per dashboard window). */
export function initF1Tv(win: BrowserWindow): void {
  dashboardWindow = win
  ipcMain.removeHandler('f1tv-get-feeds')
  ipcMain.removeHandler('f1tv-open-session-picker')
  ipcMain.removeHandler('f1tv-auto-load-feeds')
  ipcMain.handle('f1tv-get-feeds', () => ({ feeds, sessionKey: feedsSessionKey, licenseUrl }))
  ipcMain.handle('f1tv-auto-load-feeds', async (_e, sessionKey: number) => {
    const result = await fetchPlayBody(sessionKey)
    if ('error' in result) {
      console.warn(`[F1TV auto] ${result.error}`)
      return { ok: false, error: result.error }
    }
    return applyPlayBody(result.body, sessionKey, result.headers)
      ? { ok: true }
      : { ok: false, error: 'F1 TV returned no onboard feeds for this session.' }
  })
  ipcMain.handle('f1tv-open-session-picker', () => openF1TvPlayer())
}

// Discovery aid: save the JSON API responses and stream manifests the F1 TV page fetches,
// so we can see how onboard channels are listed and requested. Files go to logs/f1tv/
// (*.log.json is gitignored) and may contain signed URLs, so keep them local.
function captureApiTraffic(win: BrowserWindow): void {
  const dir = join(app.getAppPath(), 'logs', 'f1tv')
  fs.mkdirSync(dir, { recursive: true })
  const dbg = win.webContents.debugger
  try {
    dbg.attach('1.3')
  } catch (err) {
    console.warn('[F1TV] debugger attach failed:', err)
    return
  }
  void dbg.sendCommand('Network.enable')

  const pending = new Map<string, { url: string; mime: string; status: number }>()
  let n = 0

  // Request log: which headers the playback calls need (values redacted to a short prefix),
  // plus DRM license and manifest requests. Media segments are skipped.
  const isMedia = (url: string): boolean => /\.(m4s|mp4|cmfv|cmfa|ts|aac)(\?|$)/.test(url)
  const redact = (name: string, value: string): string =>
    /^(accept|accept-language|accept-encoding|content-type|content-length|origin|referer|user-agent|sec-|:|cache-control|pragma|priority|connection|host)/i.test(
      name
    )
      ? value.slice(0, 80)
      : `${value.slice(0, 8)}…(len ${value.length})`
  const logRequest = (line: string): void =>
    fs.appendFileSync(join(dir, 'requests.log'), line + '\n')

  // Session-level hook sees every process (workers, media pipeline), unlike the page's CDP target
  win.webContents.session.webRequest.onSendHeaders(
    { urls: ['https://*.formula1.com/*', 'https://*.cloudfront.net/*'] },
    (details) => {
      if (
        isMedia(details.url) ||
        /image-resizer|\.(png|jpe?g|webp|svg|woff2?|css|js)(\?|$)/.test(details.url)
      )
        return
      if (/nr-data|google-analytics|consent/.test(details.url)) return
      const headers = Object.entries(details.requestHeaders)
        .map(([k, v]) => `${k}: ${redact(k, String(v))}`)
        .join('\n    ')
      logRequest(`${details.method} ${details.url.replace(/\?.*/, '?…')}\n    ${headers}\n`)
    }
  )

  dbg.on('message', async (_e, method, params) => {
    if (method === 'Network.responseReceived') {
      const { url, mimeType, status } = params.response
      const host = new URL(url).hostname
      const interesting =
        /formula1\.com$|f1tv|ascendon|akamai|cloudfront|fastly/i.test(host) &&
        !isMedia(url) &&
        (/json|mpegurl|dash\+xml|xml|octet-stream|text/i.test(mimeType) ||
          /\.(m3u8|mpd)(\?|$)|manifest|license/i.test(url))
      if (interesting) pending.set(params.requestId, { url, mime: mimeType, status })
    } else if (method === 'Network.loadingFinished') {
      const info = pending.get(params.requestId)
      if (!info) return
      pending.delete(params.requestId)
      try {
        const { body } = await dbg.sendCommand('Network.getResponseBody', {
          requestId: params.requestId
        })
        const id = String(++n).padStart(3, '0')
        const file = join(dir, `${id}.log.json`)
        fs.writeFileSync(
          file,
          JSON.stringify({ url: info.url, status: info.status, mime: info.mime, body }, null, 2)
        )
        console.log(`[F1TV capture] ${id} ${info.status} ${info.mime} ${info.url.slice(0, 140)}`)
        if (/\/CONTENT\/PLAY\?/.test(info.url)) handlePlayResponse(body)
      } catch {
        // body not available (e.g. redirect or evicted); skip
      }
    }
  })
}

export async function waitForWidevine(): Promise<void> {
  if (!components) {
    console.warn('[F1TV] Widevine unavailable: running on stock Electron, DRM video will not play')
    return
  }
  await components.whenReady()
  console.log('[F1TV] Widevine components ready:', JSON.stringify(components.status()))
}

export function openF1TvPlayer(): void {
  if (playerWindow && !playerWindow.isDestroyed()) {
    playerWindow.focus()
    return
  }

  playerWindow = new BrowserWindow({
    width: 1280,
    height: 760,
    title: 'F1 TV (spike)',
    autoHideMenuBar: true,
    webPreferences: {
      // Own persistent session so the F1 TV login survives restarts and stays
      // separate from the dashboard's default session (which rewrites Origin headers)
      partition: 'persist:f1tv',
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  // F1 TV may reject an "Electron/x" user agent, so present as plain Chrome
  const ua = playerWindow.webContents
    .getUserAgent()
    .replace(/\s?Electron\/\S+/, '')
    .replace(/\s?f1-dashboard\/\S+/, '')
  playerWindow.webContents.setUserAgent(ua)

  playerWindow.webContents.on('console-message', (_e, _level, message) => {
    if (/widevine|drm|eme|keysystem/i.test(message)) console.log('[F1TV page]', message)
  })

  playerWindow.on('closed', () => {
    playerWindow = null
  })

  captureApiTraffic(playerWindow)

  void playerWindow.loadURL(F1TV_URL)
}
