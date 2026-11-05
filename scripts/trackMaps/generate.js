#!/usr/bin/env node
/**
 * Builds resources/track-maps/{circuit_key}.json from F1's own live timing archive: the outline,
 * start line, sectors, minisectors and pit lane all come from one qualifying session per circuit
 * (this season's, or last season's for circuits not on this year's calendar). See build.js.
 *
 * Run by hand when maps need updating; the app only reads the files it writes.
 *   pnpm generate:trackmaps                      every circuit
 *   pnpm generate:trackmaps --circuit 65         one circuit
 *   pnpm generate:trackmaps --year 2025          a different season (and the one before it)
 *   pnpm generate:trackmaps --dry-run            report only, write nothing
 *   pnpm generate:trackmaps --report out.json    also write the per-circuit results as JSON
 *
 * Needs the F1 TV login the dashboard saves when you connect to live timing.
 * A circuit whose map fails its checks keeps its previous file.
 */

const fs = require('fs')
const path = require('path')
const { loadToken, loadSeason, loadSession } = require('./archive')
const { buildTrackMap, pitLaneFor } = require('./build')

const OUTPUT_DIR = path.join(__dirname, '../../resources/track-maps')

const formatLap = (ms) => {
  const minutes = Math.floor(ms / 60000)
  return `${minutes}:${((ms - minutes * 60000) / 1000).toFixed(3).padStart(6, '0')}`
}

// Each circuit's archived qualifying sessions, newest first. The newest is used; older ones are
// fallbacks for sessions whose data is broken (Spielberg 2026's position stream misses 16 minutes).
function findSessions(seasons) {
  const sessions = new Map()
  for (const [year, season] of seasons) {
    // Latest meeting first, so a circuit raced twice in a season tries the later one first
    for (const meeting of [...season.Meetings].reverse()) {
      const qualifying = meeting.Sessions.find((s) => s.Name === 'Qualifying' && s.Path)
      if (!qualifying) continue
      if (!sessions.has(meeting.Circuit.Key)) sessions.set(meeting.Circuit.Key, [])
      sessions.get(meeting.Circuit.Key).push({ year, meeting, path: qualifying.Path })
    }
  }
  return [...sessions.entries()].sort((a, b) => a[0] - b[0])
}

const sessionLabel = ({ year, meeting }) => `${year} ${meeting.Name} Qualifying`

async function main() {
  const args = process.argv.slice(2)
  const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null)
  const onlyCircuit = option('--circuit') !== null ? Number(option('--circuit')) : null
  const year = Number(option('--year') ?? new Date().getFullYear())
  const dryRun = args.includes('--dry-run')
  const reportPath = option('--report')

  const token = loadToken()
  const seasons = []
  for (const y of [year, year - 1]) {
    const season = await loadSeason(y, token)
    if (season) seasons.push([y, season])
  }
  if (!seasons.length) throw new Error(`The archive has no ${year} or ${year - 1} season`)

  const circuits = findSessions(seasons).filter(([key]) => onlyCircuit === null || key === onlyCircuit)
  if (!circuits.length) throw new Error(`No qualifying session found for circuit ${onlyCircuit}`)
  console.log(`Building ${circuits.length} track maps from ${seasons.map(([y]) => y).join('/')} qualifying\n`)

  const report = []
  for (const [key, candidates] of circuits) {
    const { meeting } = candidates[0]
    const name = `${String(key).padStart(3)} ${meeting.Circuit.ShortName}`.padEnd(24)
    const tried = []
    const loaded = new Map()
    const load = async (candidate) => {
      if (!loaded.has(candidate.path)) loaded.set(candidate.path, await loadSession(candidate.path, token))
      return loaded.get(candidate.path)
    }

    // The newest session that gives a whole map
    let result = null
    let used = null
    for (const candidate of candidates) {
      try {
        result = buildTrackMap(await load(candidate))
      } catch (error) {
        result = { map: null, problems: [error.message] }
      }
      if (result.map) {
        used = candidate
        break
      }
      tried.push(`${sessionLabel(candidate)}: ${result.problems.join('; ')}`)
    }

    const entry = { circuit_key: key, name: meeting.Circuit.ShortName, session: used && sessionLabel(used), ...result, tried }
    report.push(entry)
    if (!result.map) {
      console.log(`${name} ✗ kept previous file:\n${tried.map((t) => `${' '.repeat(26)}${t}`).join('\n')}`)
      continue
    }
    const label = sessionLabel(used)
    for (const t of tried) result.problems.unshift(`skipped ${t}`)

    // A session can have a fine outline but no usable pit data; trace the pit lane from an older one
    let pitSession = label
    if (!result.map.pit_lane) {
      for (const candidate of candidates.slice(candidates.indexOf(used) + 1)) {
        let pit
        try {
          pit = pitLaneFor(await load(candidate), result.map.positions)
        } catch (error) {
          pit = { pitLane: null, problem: error.message }
        }
        if (pit.pitLane && !pit.problem) {
          result.map.pit_lane = pit.pitLane
          result.stats.pit = pit.stats
          pitSession = sessionLabel(candidate)
          result.problems.push(`pit lane from ${pitSession}`)
          break
        }
      }
    }

    const s = result.stats
    const pit = s.pit ? `pit ${(s.pit.lengthKm * 1000).toFixed(0)}m from ${s.pit.visits} visits` : 'no pit lane'
    console.log(
      `${name} ✓ ${label}: lap ${s.lapKm.toFixed(3)}km, offset ${s.offsetMs}ms, lines within ` +
        `${s.lineSpreadM.toFixed(1)}m, finish within ${s.finishSpreadM.toFixed(1)}m, ` +
        `minisectors ${s.minisectors ?? 'none'}, ${pit}` +
        (result.problems.length ? `\n${' '.repeat(26)}⚠ ${result.problems.join('; ')}` : '')
    )

    const file = {
      circuit_key: key,
      circuit_name: meeting.Name,
      circuit_short_name: meeting.Circuit.ShortName,
      country: meeting.Country.Name,
      ...result.map,
      source: {
        session: label,
        ...(pitSession !== label && { pit_lane_session: pitSession }),
        laps: result.top.map((lap) => ({ driver: lap.car, time: formatLap(lap.ms) })),
        timing_offset_ms: s.offsetMs,
        generated_at: new Date().toISOString()
      }
    }
    if (!dryRun) fs.writeFileSync(path.join(OUTPUT_DIR, `${key}.json`), JSON.stringify(file, null, 2))
  }

  if (reportPath) {
    fs.writeFileSync(reportPath, JSON.stringify(report.map(({ map, ...rest }) => rest), null, 2))
  }
  const failed = report.filter((r) => !r.map).length
  console.log(`\n${report.length - failed} built, ${failed} kept${dryRun ? ' (dry run, nothing written)' : ''}`)
}

main().catch((error) => {
  console.error(error.message ?? error)
  process.exitCode = 1
})
