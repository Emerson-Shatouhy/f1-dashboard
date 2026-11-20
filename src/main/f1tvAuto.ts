import { app, BrowserWindow, type Session } from 'electron'
import * as fs from 'fs'
import { join } from 'path'

// Finds the F1 TV content for a timing-feed session and fetches its CONTENT/PLAY response
// (which lists every onboard feed) without the user opening F1 TV and pressing play.
//
// A hidden F1 TV window (same persistent login as the visible one) loads the home page so the
// site's own scripts produce the session headers and the bot-protection cookie. We read those
// headers from the window's own requests and reuse them, with the session's cookie jar, for the
// calls we make ourselves.

const BASE = 'https://f1tv.formula1.com'
const PARTITION = 'persist:f1tv'
const HOME_PAGE = '/2.0/R/ENG/WEB_DASH/ALL/PAGE/395/PREMIUM/5'
const DEFAULT_CHANNEL_ID = 1033 // "F1 LIVE"; the response lists all feeds whichever channel is asked

export type AutoResult = { body: string } | { error: string }

interface HiddenSession {
  ses: Session
  headers: Record<string, string>
  close: () => void
}

let inFlight: Promise<AutoResult> | null = null
let inFlightKey: number | null = null

function log(msg: string): void {
  console.log(`[F1TV auto] ${msg}`)
}

/** The dashboard's own F1 TV subscription token; F1 TV calls it `ascendonToken` on playback requests. */
function readAscendonToken(): string | null {
  try {
    const file = join(app.getPath('userData'), 'f1auth.json')
    const data = JSON.parse(fs.readFileSync(file, 'utf-8')) as {
      token?: string
      expiresAt?: number
    }
    if (!data.token) return null
    if (data.expiresAt && data.expiresAt < Date.now()) return null
    return data.token
  } catch {
    return null
  }
}

function openHiddenSession(): Promise<HiddenSession> {
  const win = new BrowserWindow({
    show: false,
    width: 1280,
    height: 800,
    webPreferences: {
      partition: PARTITION,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false
    }
  })
  const ua = win.webContents
    .getUserAgent()
    .replace(/\s?Electron\/\S+/, '')
    .replace(/\s?f1-dashboard\/\S+/, '')
  win.webContents.setUserAgent(ua)

  const dbg = win.webContents.debugger
  dbg.attach('1.3')
  void dbg.sendCommand('Network.enable')

  return new Promise<HiddenSession>((resolve, reject) => {
    const close = (): void => {
      clearTimeout(timer)
      try {
        dbg.detach()
      } catch {
        // already detached
      }
      if (!win.isDestroyed()) win.destroy()
    }
    const timer = setTimeout(() => {
      close()
      reject(
        new Error('F1 TV did not respond. Sign in once with Cmd/Ctrl+Shift+V, then try again.')
      )
    }, 25000)

    dbg.on('message', (_e, method, params) => {
      if (method !== 'Network.requestWillBeSentExtraInfo') return
      const headers: Record<string, string> = {}
      for (const [k, v] of Object.entries(params.headers as Record<string, string>)) {
        headers[k.toLowerCase()] = String(v)
      }
      if (headers['entitlementtoken'] && headers['sessionid'] && headers['x-f1-device-info']) {
        clearTimeout(timer)
        resolve({ ses: win.webContents.session, headers: { ...headers, 'user-agent': ua }, close })
      }
    })

    win.webContents.once('did-fail-load', (_e, code, desc) => {
      close()
      reject(new Error(`Could not load F1 TV (${desc} ${code})`))
    })
    void win.loadURL(BASE + '/')
  })
}

function apiHeaders(h: Record<string, string>, extra: Record<string, string> = {}): HeadersInit {
  return {
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-US',
    correlationid: h['correlationid'] ?? `WEB-${crypto.randomUUID()}`,
    entitlementToken: h['entitlementtoken'],
    sessionid: h['sessionid'],
    'x-f1-device-info': h['x-f1-device-info'],
    'User-Agent': h['user-agent'],
    ...extra
  }
}

async function getJson(
  ses: Session,
  path: string,
  headers: HeadersInit,
  label: string
): Promise<unknown> {
  const res = await ses.fetch(BASE + path, { headers, credentials: 'include' })
  const text = await res.text()
  if (!res.ok) {
    log(`${label} -> HTTP ${res.status} ${text.slice(0, 200)}`)
    throw new Error(`${label} failed (HTTP ${res.status})`)
  }
  return JSON.parse(text)
}

/** Depth-first search for the content whose session key matches the timing feed's. */
function findContentId(root: unknown, sessionKey: number): number | null {
  const want = String(sessionKey)
  let best: number | null = null
  const walk = (o: unknown): void => {
    if (best !== null) return
    if (Array.isArray(o)) {
      o.forEach(walk)
    } else if (o && typeof o === 'object') {
      const md = (
        o as { metadata?: { contentId?: number; emfAttributes?: Record<string, string> } }
      ).metadata
      const emf = md?.emfAttributes
      if (md?.contentId && emf?.MeetingSessionKey === want && emf?.VideoType === 'meetingSession') {
        best = Number(md.contentId)
        return
      }
      Object.values(o as Record<string, unknown>).forEach(walk)
    }
  }
  walk(root)
  return best
}

async function run(sessionKey: number): Promise<AutoResult> {
  const ascendon = readAscendonToken()
  if (!ascendon) {
    return { error: 'No valid F1 TV token. Connect the live timing feed (F1TV login) first.' }
  }

  const hidden = await openHiddenSession()
  try {
    log(`session ready, looking up key ${sessionKey}`)
    const headers = apiHeaders(hidden.headers)

    const home = await getJson(hidden.ses, HOME_PAGE, headers, 'home page')
    const contentId = findContentId(home, sessionKey)
    if (contentId === null) {
      return { error: `Session ${sessionKey} isn't on the F1 TV home page.` }
    }
    log(`content ${contentId}`)

    const video = (await getJson(
      hidden.ses,
      `/4.0/R/ENG/WEB_DASH/ALL/CONTENT/VIDEO/${contentId}/PREMIUM/5`,
      headers,
      'content details'
    )) as {
      resultObj?: {
        containers?: {
          metadata?: { additionalStreams?: { channelId: number; default?: boolean }[] }
        }[]
      }
    }
    const streams = video.resultObj?.containers?.[0]?.metadata?.additionalStreams ?? []
    const channelId = streams.find((s) => s.default)?.channelId ?? DEFAULT_CHANNEL_ID

    const playPath = `/3.0/R/ENG/WEB_HLS/ALL/CONTENT/PLAY?channelId=${channelId}&contentId=${contentId}&player=player_tm`
    const res = await hidden.ses.fetch(BASE + playPath, {
      headers: apiHeaders(hidden.headers, { ascendonToken: ascendon }),
      credentials: 'include'
    })
    const body = await res.text()
    if (!res.ok) {
      log(`play -> HTTP ${res.status} ${body.slice(0, 200)}`)
      return { error: `F1 TV refused playback (HTTP ${res.status}).` }
    }
    return { body }
  } finally {
    hidden.close()
  }
}

export function fetchPlayBody(sessionKey: number): Promise<AutoResult> {
  if (!inFlight || inFlightKey !== sessionKey) {
    inFlightKey = sessionKey
    const p: Promise<AutoResult> = run(sessionKey)
      .catch((err: Error): AutoResult => ({ error: err.message }))
      .finally(() => {
        if (inFlight === p) inFlight = null
      })
    inFlight = p
  }
  return inFlight
}
