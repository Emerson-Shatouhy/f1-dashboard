/**
 * F1 live timing archive access for the track map generator: the saved F1 TV login, the season
 * indexes, and a session's position and timing streams on one clock.
 */

const fs = require('fs')
const os = require('os')
const path = require('path')
const zlib = require('zlib')

const ARCHIVE_URL = 'https://livetiming.formula1.com/static/'

// Same place the dashboard saves it (Electron's userData for the app name f1-dashboard)
const authFilePath = () => {
  const home = os.homedir()
  if (process.platform === 'darwin') {
    return path.join(home, 'Library', 'Application Support', 'f1-dashboard', 'f1auth.json')
  }
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA ?? home, 'f1-dashboard', 'f1auth.json')
  }
  return path.join(
    process.env.XDG_CONFIG_HOME ?? path.join(home, '.config'),
    'f1-dashboard',
    'f1auth.json'
  )
}

const loadToken = () => {
  let auth
  try {
    auth = JSON.parse(fs.readFileSync(authFilePath(), 'utf8'))
  } catch {
    throw new Error('No saved F1 TV login. Connect to live timing in the app to sign in, then retry.')
  }
  if (!auth.token || !(auth.expiresAt > Date.now())) {
    throw new Error('The saved F1 TV login has expired. Reconnect in the app, then retry.')
  }
  return auth.token
}

// Redirects are refused so the token only goes to the archive host
const fetchText = async (archivePath, token) => {
  const res = await fetch(ARCHIVE_URL + archivePath, {
    redirect: 'error',
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) throw new Error(`Archive request failed (${res.status}): ${archivePath}`)
  return (await res.text()).replace(/^﻿/, '')
}

/** A season's meetings, or null if the archive has none for that year yet */
async function loadSeason(year, token) {
  try {
    return JSON.parse(await fetchText(`${year}/Index.json`, token))
  } catch {
    return null
  }
}

// Stream lines look like 00:12:34.567{"some":"json"}; offsets share one clock across topics
const parseStream = (text) => {
  const entries = []
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^(\d+):(\d\d):(\d\d\.\d+)(.*)$/s)
    if (!match) continue
    try {
      const offsetMs = (Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])) * 1000
      entries.push({ offsetMs, payload: JSON.parse(match[4]) })
    } catch {
      // Skip unreadable lines
    }
  }
  return entries
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[sorted.length >> 1]
}

/**
 * Loads a session's car positions and timing patches on one UTC clock.
 *   tracks: racing number -> [[utcMs, x, y, z], ...] sorted by time (sample timestamps from the feed)
 *   timing: [{ utcMs, lines }] TimingData patches, at the time they were published
 * Timing patches have no timestamps of their own, so their stream offsets are mapped to UTC through
 * the Heartbeat stream. They're published a couple of seconds after the event; build.js fits that lag.
 */
async function loadSession(sessionPath, token) {
  const { Feeds: feeds } = JSON.parse(await fetchText(`${sessionPath}Index.json`, token))
  const missing = ['Position.z', 'TimingData', 'Heartbeat'].filter((t) => !feeds[t]?.StreamPath)
  if (missing.length) throw new Error(`session has no ${missing.join(', ')}`)

  const [positions, timing, heartbeats] = await Promise.all(
    ['Position.z', 'TimingData', 'Heartbeat'].map(async (topic) =>
      parseStream(await fetchText(sessionPath + feeds[topic].StreamPath, token))
    )
  )

  // Late heartbeats can be minutes off, so take the median of what each one implies
  const startUtc = median(
    heartbeats.map((h) => Date.parse(h.payload.Utc) - h.offsetMs).filter(Number.isFinite)
  )
  if (!Number.isFinite(startUtc)) throw new Error('session has no usable heartbeats')

  const tracks = {}
  for (const { payload } of positions) {
    if (typeof payload !== 'string') continue
    const decoded = JSON.parse(zlib.inflateRawSync(Buffer.from(payload, 'base64')).toString())
    for (const frame of decoded.Position ?? []) {
      const utcMs = Date.parse(frame.Timestamp)
      for (const [n, e] of Object.entries(frame.Entries ?? {})) {
        // Unused slots and cars without a fix sit at (0, 0)
        if (e.X || e.Y) (tracks[n] ??= []).push([utcMs, e.X, e.Y, e.Z ?? 0])
      }
    }
  }
  for (const n of Object.keys(tracks)) tracks[n].sort((a, b) => a[0] - b[0])

  return {
    tracks,
    timing: timing
      .filter((t) => t.payload?.Lines)
      .map((t) => ({ utcMs: startUtc + t.offsetMs, lines: t.payload.Lines }))
  }
}

module.exports = { loadToken, loadSeason, loadSession }
