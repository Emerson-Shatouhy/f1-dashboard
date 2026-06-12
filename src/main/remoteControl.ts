import { createServer, IncomingMessage, ServerResponse } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { networkInterfaces } from 'os'

const PORT = 5055
const clients = new Set<WebSocket>()

// Cache latest payload per data type for snapshot on new client connect
const dataCache = new Map<string, unknown>()

interface ServerSettings {
  debugMode: boolean
  loggingMode: boolean
  delayEnabled: boolean
  delayMs: number
}

const serverSettings: ServerSettings = {
  debugMode: false,
  loggingMode: false,
  delayEnabled: false,
  delayMs: 45000
}

export interface RemoteHandlers {
  setDebugMode: (enabled: boolean) => void
  setLoggingMode: (enabled: boolean) => void
  reconnect: () => void
  setDelay: (opts: { enabled: boolean; delayMs: number }) => void
}

let handlers: RemoteHandlers | null = null

// ─── Local IP detection ───────────────────────────────────────────────────────

export function getLocalIp(): string {
  const nets = networkInterfaces()
  for (const ifaces of Object.values(nets)) {
    if (!ifaces) continue
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }
  return 'localhost'
}

export function getRemoteControlUrl(): string {
  return `http://${getLocalIp()}:${PORT}`
}

// ─── Broadcast F1 data to all connected browser clients ──────────────────────

export function broadcastF1Data(type: string, payload: unknown): void {
  dataCache.set(type, payload)
  if (clients.size === 0) return
  const msg = JSON.stringify({ type, payload })
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(msg)
  })
}

function broadcastToAll(msg: string): void {
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(msg)
  })
}

// ─── iPad viewer HTML ─────────────────────────────────────────────────────────

function getViewerHtml(): string {
  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>F1 Dashboard</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #111827; --surface: #1f2937; --border: #374151;
      --text: #f9fafb; --muted: #9ca3af; --green: #22c55e;
      --yellow: #facc15; --red: #ef4444; --blue: #3b82f6;
      --purple: #a855f7; --amber: #f59e0b;
    }
    html, body {
      height: 100%; background: var(--bg); color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif;
      -webkit-text-size-adjust: 100%;
    }
    body { display: flex; flex-direction: column; height: 100dvh; overflow: hidden; }

    /* ── Header ── */
    .header {
      background: var(--surface); border-bottom: 1px solid var(--border);
      padding: 10px 16px; display: flex; align-items: center;
      justify-content: space-between; gap: 12px; flex-shrink: 0;
    }
    .header-left { display: flex; align-items: center; gap: 10px; min-width: 0; overflow: hidden; }
    .f1-logo { font-size: 13px; font-weight: 900; letter-spacing: 0.08em; color: var(--red); flex-shrink: 0; }
    .meeting-name { font-size: 14px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .session-badge {
      font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
      background: var(--border); color: var(--muted); border-radius: 6px; padding: 3px 8px; flex-shrink: 0;
    }
    .header-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
    .lap-display { font-family: 'SF Mono', monospace; font-size: 15px; font-weight: 700; }
    .lap-display span { color: var(--muted); font-weight: 400; }
    .conn-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--muted); transition: background 0.3s; flex-shrink: 0; }
    .conn-dot.on { background: var(--green); box-shadow: 0 0 6px var(--green); animation: blink 2s ease-in-out infinite; }
    .conn-dot.reconnecting { background: var(--yellow); animation: blink 0.7s infinite; }
    .settings-btn {
      width: 30px; height: 30px; border-radius: 50%; background: var(--border);
      border: 1px solid #4b5563; color: var(--muted); font-size: 15px; cursor: pointer;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      transition: background 0.15s, color 0.15s;
    }
    .settings-btn:active { background: #4b5563; color: var(--text); }
    @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }

    /* ── Track status bar ── */
    .status-bar { height: 4px; width: 100%; flex-shrink: 0; transition: background 0.4s; }

    /* ── Split layout ── */
    .content { display: flex; flex: 1; min-height: 0; overflow: hidden; }
    .left-panel { width: 50%; display: flex; flex-direction: column; overflow: hidden; border-right: 1px solid var(--border); }
    .right-panel { width: 50%; display: flex; flex-direction: column; overflow: hidden; }
    .panel-header {
      font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
      color: var(--muted); padding: 8px 12px; border-bottom: 1px solid var(--border);
      flex-shrink: 0; background: var(--surface);
    }
    .panel-scroll { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; }

    /* ── Timing table ── */
    .table-wrap { overflow-x: hidden; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    colgroup col.col-pos    { width: 44px; }
    colgroup col.col-driver { width: auto; }
    colgroup col.col-gap    { width: 80px; }
    colgroup col.col-tire   { width: 42px; }
    colgroup col.col-lap    { width: 80px; }
    thead th {
      font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
      color: var(--muted); padding: 6px 10px; border-bottom: 1px solid var(--border); text-align: left;
    }
    thead th.center { text-align: center; }
    tbody tr { border-bottom: 1px solid var(--border); }
    td { padding: 9px 10px; vertical-align: middle; }
    .pos { font-size: 18px; font-weight: 900; text-align: center; font-variant-numeric: tabular-nums; }
    .pos.p1 { color: var(--yellow); }
    .driver-cell { display: flex; align-items: center; gap: 8px; }
    .team-stripe { width: 3px; height: 22px; border-radius: 2px; flex-shrink: 0; }
    .tla { font-size: 16px; font-weight: 800; letter-spacing: 0.02em; }
    .badges { display: flex; gap: 4px; flex-wrap: wrap; }
    .badge { font-size: 10px; font-weight: 700; letter-spacing: 0.06em; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; }
    .badge.pit { background: rgba(250,204,21,0.2); color: var(--yellow); }
    .badge.out { background: rgba(156,163,175,0.2); color: var(--muted); }
    .badge.dnf { background: rgba(239,68,68,0.2); color: var(--red); }
    .gap-cell { font-family: 'SF Mono', monospace; font-size: 13px; color: var(--muted); }
    .gap-cell.leader { color: var(--text); font-weight: 700; }
    .gap-cell.catching { color: #34d399; }
    .tire-cell { text-align: center; }
    .tire-badge { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; border: 2px solid; font-size: 11px; font-weight: 900; }
    .laptime-cell { font-family: 'SF Mono', monospace; font-size: 13px; color: var(--muted); }
    .laptime-cell.fastest { color: #c084fc; }
    .laptime-cell.personal { color: #34d399; }
    .empty { text-align: center; padding: 60px 20px; color: var(--muted); }
    .empty h2 { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
    .empty p { font-size: 14px; }

    /* ── Race control messages ── */
    .msg-list { display: flex; flex-direction: column; padding: 8px; gap: 8px; }
    .msg-card {
      background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
      padding: 12px 14px; display: flex; gap: 12px; align-items: flex-start;
    }
    .msg-flag { width: 10px; border-radius: 3px; flex-shrink: 0; margin-top: 3px; align-self: stretch; }
    .msg-body { flex: 1; min-width: 0; }
    .msg-text { font-size: 14px; font-weight: 600; color: var(--text); line-height: 1.4; }
    .msg-meta { font-size: 11px; color: var(--muted); margin-top: 4px; }
    .msg-empty { text-align: center; padding: 60px 20px; color: var(--muted); font-size: 14px; }

    /* ── Settings overlay ── */
    .settings-overlay {
      position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.6);
      display: flex; align-items: flex-end; justify-content: center;
    }
    .settings-drawer {
      background: #111827; border: 1px solid var(--border); border-radius: 20px 20px 0 0;
      width: 100%; max-width: 520px; max-height: 85dvh; overflow-y: auto;
      -webkit-overflow-scrolling: touch; padding-bottom: env(safe-area-inset-bottom, 16px);
    }
    .settings-drawer-handle {
      width: 36px; height: 4px; background: var(--border); border-radius: 2px;
      margin: 12px auto 0;
    }
    .settings-drawer-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 20px 8px; border-bottom: 1px solid var(--border);
    }
    .settings-drawer-title { font-size: 15px; font-weight: 700; color: var(--text); }
    .close-btn {
      width: 28px; height: 28px; border-radius: 50%; background: var(--border);
      border: none; color: var(--muted); font-size: 16px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }

    /* ── Weather (inside settings drawer) ── */
    .weather-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 12px 16px; }
    .weather-card {
      background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
      padding: 12px; display: flex; flex-direction: column; gap: 4px;
    }
    .weather-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }
    .weather-value { font-size: 22px; font-weight: 800; color: var(--text); font-variant-numeric: tabular-nums; }
    .weather-unit { font-size: 13px; font-weight: 400; color: var(--muted); }
    .weather-empty { text-align: center; padding: 24px; color: var(--muted); font-size: 13px; }
    .rain-on { color: var(--blue) !important; }
    .rain-off { color: var(--green) !important; }

    /* ── Settings rows (inside drawer) ── */
    .settings-list { display: flex; flex-direction: column; padding: 12px 16px; }
    .settings-section-title {
      font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
      color: var(--muted); padding: 4px 0 8px;
    }
    .settings-row {
      background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
      padding: 14px 16px; display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 8px;
    }
    .settings-row-info { display: flex; flex-direction: column; gap: 2px; }
    .settings-row-label { font-size: 15px; font-weight: 600; color: var(--text); }
    .settings-row-desc { font-size: 12px; color: var(--muted); }
    .toggle-wrap { position: relative; width: 48px; height: 28px; flex-shrink: 0; }
    .toggle-input { position: absolute; opacity: 0; width: 0; height: 0; }
    .toggle-slider {
      position: absolute; inset: 0; background: var(--border); border-radius: 14px;
      cursor: pointer; transition: background 0.2s;
    }
    .toggle-slider::before {
      content: ''; position: absolute; width: 22px; height: 22px;
      left: 3px; top: 3px; background: white; border-radius: 50%;
      transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.4);
    }
    .toggle-input:checked + .toggle-slider { background: var(--green); }
    .toggle-input:checked + .toggle-slider::before { transform: translateX(20px); }
    .presets-row { display: flex; gap: 8px; margin-bottom: 8px; }
    .preset-btn {
      flex: 1; padding: 10px 4px; background: var(--surface); border: 1px solid var(--border);
      border-radius: 8px; color: var(--muted); font-size: 13px; font-weight: 700; cursor: pointer;
      transition: all 0.15s; text-align: center;
    }
    .preset-btn.selected { background: var(--red); border-color: var(--red); color: white; }
    .reconnect-btn {
      width: 100%; padding: 14px; background: var(--surface); border: 1px solid var(--border);
      border-radius: 10px; color: var(--text); font-size: 15px; font-weight: 600;
      cursor: pointer; transition: background 0.15s; text-align: center; margin-top: 8px;
    }
    .reconnect-btn:active { background: var(--border); }
    .reconnect-btn.loading { color: var(--muted); pointer-events: none; }
    .delay-status { font-size: 12px; color: var(--muted); }
    .delay-status.active { color: var(--blue); }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <span class="f1-logo">F1</span>
      <span class="meeting-name" id="meetingName">Live Timing</span>
      <span class="session-badge" id="sessionBadge">—</span>
    </div>
    <div class="header-right">
      <span class="lap-display" id="lapDisplay" style="display:none"></span>
      <div class="conn-dot reconnecting" id="connDot"></div>
      <button class="settings-btn" id="settingsToggle" title="Settings">⚙</button>
    </div>
  </div>
  <div class="status-bar" id="statusBar"></div>

  <!-- Split content area -->
  <div class="content">
    <!-- Left: Timing board -->
    <div class="left-panel">
      <div class="panel-header">Timing</div>
      <div class="panel-scroll">
        <div class="table-wrap">
          <table>
            <colgroup>
              <col class="col-pos"> <col class="col-driver">
              <col class="col-gap"> <col class="col-tire"> <col class="col-lap">
            </colgroup>
            <thead>
              <tr>
                <th class="center">Pos</th><th>Driver</th>
                <th>Gap</th><th class="center">Tyre</th><th>Last Lap</th>
              </tr>
            </thead>
            <tbody id="tbody">
              <tr><td colspan="5" class="empty">
                <h2>Waiting for data\u2026</h2>
                <p>Connect to a live session to see timing</p>
              </td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Right: Race control messages -->
    <div class="right-panel">
      <div class="panel-header">Race Control</div>
      <div class="panel-scroll">
        <div class="msg-list" id="msgList">
          <p class="msg-empty">No race control messages yet</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Settings overlay (slide-up drawer) -->
  <div class="settings-overlay" id="settingsOverlay" style="display:none">
    <div class="settings-drawer">
      <div class="settings-drawer-handle"></div>
      <div class="settings-drawer-header">
        <span class="settings-drawer-title">Settings</span>
        <button class="close-btn" id="settingsClose">\u00d7</button>
      </div>

      <!-- Weather section -->
      <div class="settings-section-title" style="padding: 12px 16px 0">Weather</div>
      <div id="weatherContent">
        <p class="weather-empty">No weather data yet</p>
      </div>

      <!-- TV Delay + Connection -->
      <div class="settings-list">
        <div class="settings-section-title">TV Delay</div>
        <div class="settings-row">
          <div class="settings-row-info">
            <span class="settings-row-label">Enable TV Delay</span>
            <span class="settings-row-desc delay-status" id="delayStatus">Off</span>
          </div>
          <label class="toggle-wrap">
            <input type="checkbox" class="toggle-input" id="delayToggle">
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="presets-row" id="presets">
          <button class="preset-btn" data-ms="30000">30s</button>
          <button class="preset-btn selected" data-ms="45000">45s</button>
          <button class="preset-btn" data-ms="60000">60s</button>
          <button class="preset-btn" data-ms="90000">90s</button>
        </div>

        <div class="settings-section-title" style="margin-top:8px">Connection</div>
        <div class="settings-row">
          <div class="settings-row-info">
            <span class="settings-row-label">Debug Mode</span>
            <span class="settings-row-desc">Use local debug WebSocket feed</span>
          </div>
          <label class="toggle-wrap">
            <input type="checkbox" class="toggle-input" id="debugToggle">
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="settings-row">
          <div class="settings-row-info">
            <span class="settings-row-label">Logging</span>
            <span class="settings-row-desc">Save F1 messages to log files</span>
          </div>
          <label class="toggle-wrap">
            <input type="checkbox" class="toggle-input" id="loggingToggle">
            <span class="toggle-slider"></span>
          </label>
        </div>
        <button class="reconnect-btn" id="reconnectBtn">Reconnect to F1</button>
      </div>
    </div>
  </div>

  <script>
    // ── State ─────────────────────────────────────────────────────────────────
    const S = {
      drivers: {}, timing: {}, stints: {}, lap: {},
      trackStatus: '1', sessionType: '', sessionName: '', meetingName: '',
      messages: {},
      weather: null,
      settings: { debugMode: false, loggingMode: false, delayEnabled: false, delayMs: 45000 }
    }

    // ── Settings overlay toggle ────────────────────────────────────────────────
    document.getElementById('settingsToggle').addEventListener('click', () => {
      document.getElementById('settingsOverlay').style.display = 'flex'
    })
    document.getElementById('settingsClose').addEventListener('click', () => {
      document.getElementById('settingsOverlay').style.display = 'none'
    })
    document.getElementById('settingsOverlay').addEventListener('click', (e) => {
      if (e.target === document.getElementById('settingsOverlay')) {
        document.getElementById('settingsOverlay').style.display = 'none'
      }
    })

    // ── Deep merge helper ─────────────────────────────────────────────────────
    function merge(target, source) {
      if (!source || typeof source !== 'object') return source
      const out = Object.assign({}, target)
      for (const k of Object.keys(source)) {
        if (source[k] !== null && typeof source[k] === 'object' && !Array.isArray(source[k])) {
          out[k] = merge(out[k] || {}, source[k])
        } else {
          out[k] = source[k]
        }
      }
      return out
    }

    // ── WebSocket command sender ───────────────────────────────────────────────
    let ws
    function sendCommand(command, payload) {
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'command', command, payload: payload || {} }))
      }
    }

    // ── Message handler ───────────────────────────────────────────────────────
    function onMsg(type, payload) {
      if (type === 'driverList') {
        S.drivers = merge(S.drivers, payload)
      } else if (type === 'timingData') {
        if (payload.Lines) S.timing = merge(S.timing, payload.Lines)
      } else if (type === 'timingAppData') {
        if (payload.Lines) {
          for (const [num, line] of Object.entries(payload.Lines)) {
            if (line.Stints) S.stints[num] = merge(S.stints[num] || {}, line.Stints)
          }
        }
      } else if (type === 'lapCount') {
        S.lap = Object.assign({}, S.lap, payload)
      } else if (type === 'trackStatus') {
        S.trackStatus = payload.Status || '1'
        updateStatusBar()
      } else if (type === 'sessionInfo') {
        S.sessionType = payload.Type || ''
        S.sessionName = payload.Name || ''
        S.meetingName = payload.Meeting?.Name || 'Live Timing'
        document.getElementById('meetingName').textContent = S.meetingName
        document.getElementById('sessionBadge').textContent = S.sessionName || '\u2014'
      } else if (type === 'weatherData') {
        S.weather = payload
        renderWeather()
        return
      } else if (type === 'raceControlMessages') {
        const msgs = payload && payload.Messages ? payload.Messages : payload || {}
        S.messages = merge(S.messages, msgs)
        renderMessages()
        return
      } else if (type === 'settings') {
        S.settings = Object.assign({}, S.settings, payload)
        renderSettings()
        return
      }
      render()
    }

    // ── Track status ──────────────────────────────────────────────────────────
    const STATUS_CFG = {
      '1': '#22c55e', '2': '#facc15', '4': '#3b82f6',
      '5': '#ef4444', '6': '#a855f7', '7': '#f59e0b'
    }
    function updateStatusBar() {
      document.getElementById('statusBar').style.background = STATUS_CFG[S.trackStatus] || '#22c55e'
    }

    // ── Tire helpers ──────────────────────────────────────────────────────────
    const TIRE_COLOR = { SOFT:'#e8002d', MEDIUM:'#ffd600', HARD:'#e8e8e8', INTERMEDIATE:'#43b02a', WET:'#0067ff' }
    const TIRE_ABBREV = { SOFT:'S', MEDIUM:'M', HARD:'H', INTERMEDIATE:'I', WET:'W' }
    function getCurrentCompound(carNum) {
      const s = S.stints[carNum]; if (!s) return null
      const nums = Object.keys(s).map(Number).sort((a,b) => b-a)
      return nums.length ? s[nums[0]]?.Compound || null : null
    }
    function tireBadge(compound) {
      if (!compound) return '<span style="color:#6b7280">\u2014</span>'
      const color = TIRE_COLOR[compound] || '#888'
      const letter = TIRE_ABBREV[compound] || compound[0]
      return \`<span class="tire-badge" style="border-color:\${color};color:\${color}">\${letter}</span>\`
    }

    // ── Live timing render ────────────────────────────────────────────────────
    function render() {
      const isRace = S.sessionType === 'Race'
      const lapEl = document.getElementById('lapDisplay')
      if (isRace && S.lap.TotalLaps) {
        lapEl.style.display = ''
        lapEl.innerHTML = 'Lap ' + (S.lap.CurrentLap || '?') + '<span> / ' + S.lap.TotalLaps + '</span>'
      } else {
        lapEl.style.display = 'none'
      }
      const rows = Object.entries(S.timing)
        .map(([num, t]) => ({ num, t, d: S.drivers[num] }))
        .filter(x => x.d && x.t.ShowPosition !== false && x.t.Position)
        .sort((a, b) => (parseInt(a.t.Position) || 99) - (parseInt(b.t.Position) || 99))
      if (!rows.length) return
      const html = rows.map(({ num, t, d }) => {
        const pos = t.Position || '\u2014'
        const posNum = parseInt(pos)
        const teamColor = d.TeamColour ? '#' + d.TeamColour : '#888'
        let gap = '\u2014', gapClass = 'gap-cell'
        if (posNum === 1) { gap = 'Leader'; gapClass += ' leader' }
        else if (isRace) {
          gap = t.GapToLeader || '\u2014'
          if (t.IntervalToPositionAhead?.Catching) gapClass += ' catching'
        } else {
          gap = t.TimeDiffToFastest || t.TimeDiffToPositionAhead || '\u2014'
        }
        const badges = []
        if (t.InPit)         badges.push('<span class="badge pit">PIT</span>')
        if (t.PitOut)        badges.push('<span class="badge out">OUT</span>')
        if (!t.ShowPosition) badges.push('<span class="badge dnf">DNF</span>')
        const ll = t.LastLapTime
        let lapClass = 'laptime-cell'
        if (ll?.OverallFastest) lapClass += ' fastest'
        else if (ll?.PersonalFastest) lapClass += ' personal'
        const lapVal = ll?.Value || '\u2014'
        return \`<tr>
          <td class="pos\${posNum === 1 ? ' p1' : ''}">\${pos}</td>
          <td><div class="driver-cell">
            <div class="team-stripe" style="background:\${teamColor}"></div>
            <span class="tla">\${d.Tla}</span>
            <div class="badges">\${badges.join('')}</div>
          </div></td>
          <td class="\${gapClass}">\${gap}</td>
          <td class="tire-cell">\${tireBadge(getCurrentCompound(num))}</td>
          <td class="\${lapClass}">\${lapVal}</td>
        </tr>\`
      }).join('')
      document.getElementById('tbody').innerHTML = html
    }

    // ── Race control messages render ──────────────────────────────────────────
    const FLAG_COLORS = {
      'GREEN': '#22c55e', 'YELLOW': '#facc15', 'DOUBLE YELLOW': '#facc15',
      'RED': '#ef4444', 'BLUE': '#3b82f6', 'CHEQUERED': '#f9fafb',
      'CLEAR': '#9ca3af', 'SAFETY CAR': '#3b82f6', 'VIRTUAL SAFETY CAR': '#a855f7'
    }
    function renderMessages() {
      const el = document.getElementById('msgList')
      const entries = Object.values(S.messages).filter(m => m && m.Message)
      if (!entries.length) {
        el.innerHTML = '<p class="msg-empty">No race control messages yet</p>'
        return
      }
      entries.sort((a, b) => (b.Utc || '').localeCompare(a.Utc || ''))
      el.innerHTML = entries.map(m => {
        const flagColor = FLAG_COLORS[m.Flag] || '#6b7280'
        const time = m.Utc ? new Date(m.Utc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''
        const meta = [m.Lap ? \`Lap \${m.Lap}\` : '', m.Category || '', time].filter(Boolean).join(' \u00b7 ')
        return \`<div class="msg-card">
          <div class="msg-flag" style="background:\${flagColor}"></div>
          <div class="msg-body">
            <div class="msg-text">\${m.Message}</div>
            <div class="msg-meta">\${meta}</div>
          </div>
        </div>\`
      }).join('')
    }

    // ── Weather render ────────────────────────────────────────────────────────
    function windDir(deg) {
      const d = parseFloat(deg)
      if (isNaN(d)) return '\u2014'
      return ['N','NE','E','SE','S','SW','W','NW'][Math.round(d / 45) % 8]
    }
    function renderWeather() {
      const el = document.getElementById('weatherContent')
      if (!S.weather) {
        el.innerHTML = '<p class="weather-empty">No weather data yet</p>'
        return
      }
      const w = S.weather
      const raining = parseFloat(w.Rainfall || '0') > 0
      el.innerHTML = \`<div class="weather-grid">
        <div class="weather-card">
          <span class="weather-label">Air Temp</span>
          <span class="weather-value">\${parseFloat(w.AirTemp||'0').toFixed(1)}<span class="weather-unit">\u00b0C</span></span>
        </div>
        <div class="weather-card">
          <span class="weather-label">Track Temp</span>
          <span class="weather-value">\${parseFloat(w.TrackTemp||'0').toFixed(1)}<span class="weather-unit">\u00b0C</span></span>
        </div>
        <div class="weather-card">
          <span class="weather-label">Humidity</span>
          <span class="weather-value">\${parseFloat(w.Humidity||'0').toFixed(0)}<span class="weather-unit">%</span></span>
        </div>
        <div class="weather-card">
          <span class="weather-label">Rainfall</span>
          <span class="weather-value \${raining ? 'rain-on' : 'rain-off'}">\${raining ? 'Yes' : 'No'}</span>
        </div>
        <div class="weather-card">
          <span class="weather-label">Wind Speed</span>
          <span class="weather-value">\${parseFloat(w.WindSpeed||'0').toFixed(1)}<span class="weather-unit">m/s</span></span>
        </div>
        <div class="weather-card">
          <span class="weather-label">Wind Dir</span>
          <span class="weather-value">\${windDir(w.WindDirection)}</span>
        </div>
      </div>\`
    }

    // ── Settings render ───────────────────────────────────────────────────────
    function renderSettings() {
      const s = S.settings
      document.getElementById('delayToggle').checked = s.delayEnabled
      const delayStatus = document.getElementById('delayStatus')
      if (s.delayEnabled) {
        delayStatus.textContent = \`Active \u00b7 \${s.delayMs / 1000}s\`
        delayStatus.className = 'settings-row-desc delay-status active'
      } else {
        delayStatus.textContent = 'Off'
        delayStatus.className = 'settings-row-desc delay-status'
      }
      document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.classList.toggle('selected', parseInt(btn.dataset.ms) === s.delayMs)
      })
      document.getElementById('debugToggle').checked = s.debugMode
      document.getElementById('loggingToggle').checked = s.loggingMode
    }

    // ── Settings event listeners ──────────────────────────────────────────────
    document.getElementById('delayToggle').addEventListener('change', e => {
      S.settings.delayEnabled = e.target.checked
      sendCommand('setDelay', { enabled: e.target.checked, delayMs: S.settings.delayMs })
      renderSettings()
    })
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        S.settings.delayMs = parseInt(btn.dataset.ms)
        if (S.settings.delayEnabled) {
          sendCommand('setDelay', { enabled: true, delayMs: S.settings.delayMs })
        }
        renderSettings()
      })
    })
    document.getElementById('debugToggle').addEventListener('change', e => {
      S.settings.debugMode = e.target.checked
      sendCommand('setDebugMode', { enabled: e.target.checked })
    })
    document.getElementById('loggingToggle').addEventListener('change', e => {
      S.settings.loggingMode = e.target.checked
      sendCommand('setLoggingMode', { enabled: e.target.checked })
    })
    document.getElementById('reconnectBtn').addEventListener('click', () => {
      const btn = document.getElementById('reconnectBtn')
      btn.textContent = 'Reconnecting\u2026'
      btn.classList.add('loading')
      sendCommand('reconnect')
      setTimeout(() => {
        btn.textContent = 'Reconnect to F1'
        btn.classList.remove('loading')
      }, 3000)
    })

    // ── WebSocket ─────────────────────────────────────────────────────────────
    function connect() {
      ws = new WebSocket('ws://' + location.hostname + ':' + location.port)
      ws.onopen = () => { document.getElementById('connDot').className = 'conn-dot on' }
      ws.onclose = () => {
        document.getElementById('connDot').className = 'conn-dot reconnecting'
        setTimeout(connect, 2000)
      }
      ws.onerror = () => ws.close()
      ws.onmessage = e => {
        try { const { type, payload } = JSON.parse(e.data); onMsg(type, payload) } catch {}
      }
    }

    updateStatusBar()
    renderSettings()
    connect()
  </script>
</body>
</html>`
}

// ─── Server startup ───────────────────────────────────────────────────────────

export function startRemoteControl(remoteHandlers: RemoteHandlers): void {
  handlers = remoteHandlers

  const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
    if (req.url === '/' || req.url === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(getViewerHtml())
    } else {
      res.writeHead(404)
      res.end('Not found')
    }
  })

  const wss = new WebSocketServer({ server: httpServer })

  wss.on('connection', (ws: WebSocket) => {
    clients.add(ws)
    console.log(`[Live Viewer] Client connected (${clients.size} total)`)

    // Send snapshot of all cached data types to new client
    dataCache.forEach((payload, type) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type, payload }))
      }
    })

    // Send current settings
    ws.send(JSON.stringify({ type: 'settings', payload: serverSettings }))

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString())
        if (msg.type !== 'command' || !handlers) return
        switch (msg.command) {
          case 'setDebugMode':
            serverSettings.debugMode = !!msg.payload?.enabled
            handlers.setDebugMode(serverSettings.debugMode)
            broadcastToAll(JSON.stringify({ type: 'settings', payload: serverSettings }))
            break
          case 'setLoggingMode':
            serverSettings.loggingMode = !!msg.payload?.enabled
            handlers.setLoggingMode(serverSettings.loggingMode)
            broadcastToAll(JSON.stringify({ type: 'settings', payload: serverSettings }))
            break
          case 'reconnect':
            handlers.reconnect()
            break
          case 'setDelay':
            serverSettings.delayEnabled = !!msg.payload?.enabled
            serverSettings.delayMs = typeof msg.payload?.delayMs === 'number' ? msg.payload.delayMs : serverSettings.delayMs
            handlers.setDelay({ enabled: serverSettings.delayEnabled, delayMs: serverSettings.delayMs })
            broadcastToAll(JSON.stringify({ type: 'settings', payload: serverSettings }))
            break
        }
      } catch {
        // ignore malformed messages
      }
    })

    ws.on('close', () => {
      clients.delete(ws)
      console.log(`[Live Viewer] Client disconnected (${clients.size} total)`)
    })
  })

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[Live Viewer] Serving at ${getRemoteControlUrl()}`)
  })
}
