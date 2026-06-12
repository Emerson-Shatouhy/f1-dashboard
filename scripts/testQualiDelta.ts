/* eslint-disable */
// Offline harness: replays a saved quali log through the REAL qualiDeltaStore +
// driverTimingStore code with a simulated clock, and checks the math.
//
//   ./node_modules/.bin/esbuild scripts/testQualiDelta.ts --bundle --platform=node \
//     --alias:@renderer=src/renderer/src --outfile=/tmp/testQualiDelta.cjs && node /tmp/testQualiDelta.cjs

import * as fs from 'fs'
import * as path from 'path'
import { useQualiDeltaStore, parseTimeMs } from '../src/renderer/src/stores/qualiDeltaStore'
import { useDriverTimingStore } from '../src/renderer/src/stores/driverTimingStore'
import { useSessionInfoStore } from '../src/renderer/src/stores/sessionInfoStore'
import { SessionInfo, TimingData } from '../src/renderer/src/types/liveTimingTypes'

const logFile = process.argv[2] ?? path.join(__dirname, '..', 'logs', 'AUS-QUAL.log')
const WATCH = process.argv[3] // optional racing number to trace

// Simulated wall clock driven by feed timestamps
let simNow = 0
Date.now = () => simNow

useSessionInfoStore.setState({
  sessionInfo: {
    Type: process.env.SESSION_TYPE ?? 'Qualifying',
    Name: 'Session'
  } as SessionInfo
})

const raw = fs.readFileSync(logFile, 'utf8')

interface Event {
  ts: string
  rn: string
  deltaMs: number
  projectedPos: number | null
  exact: boolean
}
const events: Event[] = []
let prevDisplays = useQualiDeltaStore.getState().displays

// Independent ground truth: per-driver cumulative sector sums per lap, session-best lap
const lapSectors = new Map<string, (number | null)[]>()
const bestLap = new Map<string, number>() // per part
let sessionBest: { lapMs: number; cum: [number, number, number] } | null = null
type BoundaryCheck = { rn: string; sector: number; expected: number; got: number }
const boundaryChecks: BoundaryCheck[] = []
const lapChecks: BoundaryCheck[] = []
const posChecks: { rn: string; got: number; truth: number }[] = []
const estimateErrs: number[] = []
let estimateCount = 0

function processFrame(payload: TimingData, ts: string): void {
  simNow = Date.parse(ts)

  // ---- ground truth bookkeeping (independent of the store under test) ----
  for (const rn in payload.Lines) {
    const line = payload.Lines[rn] as any
    const secs = line.Sectors
    const get = (i: number) => (Array.isArray(secs) ? secs[i] : secs?.[String(i)])
    if (!lapSectors.has(rn)) lapSectors.set(rn, [null, null, null])
    const truth = lapSectors.get(rn)!
    for (let i = 0; i < 3; i++) {
      const v = get(i)?.Value
      if (typeof v === 'string' && v !== '') {
        const ms = parseTimeMs(v)
        if (ms !== null && truth[i] === null) {
          const prev = i === 0 ? 0 : truth[i - 1]
          if (prev !== null) truth[i] = prev + ms
        }
      } else if (v === '' && i === 0) {
        // new lap's S1 not yet set; S2/S3 clears handled at LastLapTime below
      }
    }
    const lapVal = line.LastLapTime?.Value
    if (typeof lapVal === 'string' && lapVal !== '') {
      const lapMs = parseTimeMs(lapVal)
      if (lapMs !== null && truth[0] !== null && truth[1] !== null) {
        // verify sum consistency before trusting as truth
        if (truth[2] !== null && Math.abs(truth[2] - lapMs) <= 2) {
          const cum: [number, number, number] = [truth[0], truth[1], lapMs]
          const prevBest = bestLap.get(rn)
          if (prevBest === undefined || lapMs < prevBest) bestLap.set(rn, lapMs)
          if (!sessionBest || lapMs < sessionBest.lapMs) sessionBest = { lapMs, cum }
        }
      }
      lapSectors.set(rn, [null, null, null])
    }
  }
  if (typeof (payload as any).SessionPart === 'number') bestLap.clear()
}

let frameCount = 0
for (const frameRaw of raw.split('\x1e')) {
  const frame = frameRaw.trim()
  if (!frame || !frame.includes('"TimingData"')) continue
  let msg: any
  try {
    msg = JSON.parse(frame)
  } catch {
    continue
  }
  let payloads: Array<[TimingData, string]> = []
  if (msg.target === 'feed' && msg.arguments?.[0] === 'TimingData') {
    payloads.push([msg.arguments[1], msg.arguments[2]])
  } else if ((msg.type === 2 || msg.type === 3) && msg.result?.TimingData) {
    payloads.push([msg.result.TimingData, '2026-03-07T04:58:51.000Z'])
  }

  for (const [payload, ts] of payloads) {
    frameCount++
    // snapshot of session best BEFORE this frame (displays generated against the
    // reference as it was when the frame was processed)
    const refBefore = sessionBest

    processFrame(payload, ts)
    if (!payload.Lines) continue
    useDriverTimingStore.getState().updateDriverTiming(payload.Lines)
    useQualiDeltaStore.getState().ingestTimingPatch(payload)

    const displays = useQualiDeltaStore.getState().displays
    if (displays === prevDisplays) continue
    for (const rn in displays) {
      const d = displays[rn]
      if (d === prevDisplays[rn]) continue
      events.push({ ts, rn, deltaMs: d.deltaMs!, projectedPos: d.projectedPos, exact: d.exact })
      if (WATCH && rn === WATCH) {
        console.log(
          `${ts.slice(11, 23)} #${rn} ${d.exact ? 'EXACT' : 'est. '} ` +
            `${d.deltaMs! >= 0 ? '+' : ''}${(d.deltaMs! / 1000).toFixed(3)}  →P${d.projectedPos}`
        )
      }

      // ---- checks ----
      if (d.exact && refBefore) {
        const truth = lapSectors.get(rn)
        const line = payload.Lines[rn] as any
        const lapVal = line?.LastLapTime?.Value
        if (typeof lapVal === 'string' && lapVal !== '') {
          const lapMs = parseTimeMs(lapVal)!
          lapChecks.push({ rn, sector: 2, expected: lapMs - refBefore.lapMs, got: d.deltaMs! })
        } else if (truth) {
          for (let s = 0; s < 2; s++) {
            // the boundary that just completed is the highest non-null cum
            if (truth[s] !== null && (s === 1 ? true : truth[1] === null)) {
              const expected = truth[s]! - refBefore.cum[s]
              boundaryChecks.push({ rn, sector: s, expected, got: d.deltaMs! })
            }
          }
        }
        // projected position at lap completion vs the feed's own Position field —
        // the authoritative classification at that exact moment
        if (d.projectedPos !== null && typeof lapVal === 'string' && lapVal !== '') {
          const feedPos = (payload.Lines[rn] as any)?.Position
          if (typeof feedPos === 'string' && feedPos !== '') {
            posChecks.push({ rn, got: d.projectedPos, truth: parseInt(feedPos, 10) })
          }
        }
      } else if (!d.exact) {
        estimateCount++
      }
    }
    prevDisplays = displays
  }
}

console.log(`\nframes: ${frameCount}, display events: ${events.length} (${estimateCount} estimated)`)

const badBoundary = boundaryChecks.filter((c) => Math.abs(c.expected - c.got) > 2)
console.log(`boundary exact-delta checks: ${boundaryChecks.length}, mismatches: ${badBoundary.length}`)
for (const b of badBoundary.slice(0, 5))
  console.log(`  #${b.rn} S${b.sector + 1}: expected ${b.expected} got ${b.got}`)

const badLap = lapChecks.filter((c) => Math.abs(c.expected - c.got) > 2)
console.log(`lap-completion delta checks: ${lapChecks.length}, mismatches: ${badLap.length}`)
for (const b of badLap.slice(0, 5))
  console.log(`  #${b.rn}: expected ${b.expected} got ${b.got}`)

const badPos = posChecks.filter((c) => c.got !== c.truth)
console.log(`lap-completion position checks: ${posChecks.length}, mismatches: ${badPos.length}`)
for (const b of badPos.slice(0, 5)) console.log(`  #${b.rn}: got P${b.got} truth P${b.truth}`)

// Estimate plausibility: compare each estimated delta to the next exact delta for
// the same driver (they should be in the same ballpark on a steady push lap)
let pairs = 0
let sumAbsErr = 0
let worst = 0
for (let i = 0; i < events.length; i++) {
  const e = events[i]
  if (e.exact) continue
  for (let j = i + 1; j < events.length && j < i + 40; j++) {
    const n = events[j]
    if (n.rn !== e.rn) continue
    if (!n.exact) continue
    const err = Math.abs(n.deltaMs - e.deltaMs)
    pairs++
    sumAbsErr += err
    if (err > worst) worst = err
    break
  }
}
if (pairs > 0) {
  console.log(
    `estimate→next-exact drift: ${pairs} pairs, mean ${(sumAbsErr / pairs).toFixed(0)}ms, worst ${worst.toFixed(0)}ms`
  )
}
