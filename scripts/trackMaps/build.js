/**
 * Builds one circuit's track map from a qualifying session (see archive.js for loading it).
 *
 * Everything is in F1's position frame: decimetres, y up. F1 snaps car positions onto reference
 * lines (the top-5 laps sit within 0.4m of each other), so a handful of laps traces the track exactly.
 *
 *   outline     the five fastest drivers' best laps, averaged into points every 5m, point 0 on the line
 *   lines       sector and minisector starts: where cars are when TimingData says they finished one
 *   pit lane    every pit visit's moving samples averaged the same way, joined to the track with curves
 *
 * Timing patches are published about 2.4s after the event (Austin and Mexico 2026), so positions are
 * taken at (publish time - offset), with the offset fitted per session from the sector and minisector
 * crossings: those land in corners where speeds differ, so a wrong offset visibly scatters them. Lap
 * completions can't pin it down, because the line is on a straight where every car is at the same speed.
 */

const STEP = 50 // Outline spacing: 5m
const MIN_SPEED = 3 // m/s; slower pit samples are cars stopped in their box or garage
const ON_TRACK = 15 // 1.5m: on track, positions sit on F1's reference line to within 0.4m
const PIT_STATUSES = new Set([2064, 2068]) // Minisector statuses meaning the car is in the pit lane

// Checks; any failure keeps the previous file
const LAP_KM = [3, 7.5]
const MAX_OFFSET_SPREAD = 80 // 8m: the fitted offset should pull every line's crossings this tight
const MAX_LINE_SPREAD = 1000 // 100m p10-p90 for a sector line
const MIN_CROSSINGS = 30
const MAX_MINISECTOR_IQR = 1000 // 100m; fast minisectors reach ~65m at 80m between samples
const PIT_KM = [0.15, 1.5]

// --- small helpers ---

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[sorted.length >> 1]
}
const quantile = (values, q) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))]
}
const lapTimeMs = (value) => {
  const match = /^(\d+):(\d+(?:\.\d+)?)$/.exec(value ?? '')
  return match ? Number(match[1]) * 60000 + Number(match[2]) * 1000 : null
}

// --- polylines ---

// Evenly spaced points along a path; a closed path wraps back to its start
function resample(points, step, closed) {
  const path = closed ? [...points, points[0]] : points
  const out = [path[0]]
  let carried = 0
  for (let i = 1; i < path.length; i++) {
    const [ax, ay] = path[i - 1]
    const [bx, by] = path[i]
    const length = Math.hypot(bx - ax, by - ay)
    let at = step - carried
    while (at <= length) {
      const f = at / length
      out.push([ax + (bx - ax) * f, ay + (by - ay) * f])
      at += step
    }
    carried = length - (at - step)
  }
  if (closed) {
    const last = out[out.length - 1]
    if (Math.hypot(last[0] - out[0][0], last[1] - out[0][1]) < step / 2) out.pop()
  } else if (out[out.length - 1] !== path[path.length - 1]) {
    out.push(path[path.length - 1])
  }
  return out
}

// A grid of segment indices so projecting thousands of samples stays fast
function segmentIndex(points, closed) {
  const cell = 300
  const grid = new Map()
  const count = closed ? points.length : points.length - 1
  for (let i = 0; i < count; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    for (let x = Math.floor(Math.min(a[0], b[0]) / cell) - 1; x <= Math.floor(Math.max(a[0], b[0]) / cell) + 1; x++) {
      for (let y = Math.floor(Math.min(a[1], b[1]) / cell) - 1; y <= Math.floor(Math.max(a[1], b[1]) / cell) + 1; y++) {
        const key = `${x},${y}`
        if (!grid.has(key)) grid.set(key, [])
        grid.get(key).push(i)
      }
    }
  }
  return { points, grid, cell }
}

// Nearest point on the polyline: segment i, fraction f along it, distance d, signed sideways offset lat
function project(index, x, y) {
  const segments = index.grid.get(`${Math.floor(x / index.cell)},${Math.floor(y / index.cell)}`)
  if (!segments) return null
  const { points } = index
  let best = null
  for (const i of segments) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const lengthSq = dx * dx + dy * dy || 1
    const f = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / lengthSq))
    const d = Math.hypot(x - a[0] - dx * f, y - a[1] - dy * f)
    if (!best || d < best.d) {
      best = { i, f, d, lat: ((x - a[0]) * -dy + (y - a[1]) * dx) / Math.sqrt(lengthSq) }
    }
  }
  return best
}

const nearestIndex = (pr, count) => (pr.f < 0.5 ? pr.i : (pr.i + 1) % count)

// Moves each point sideways to the median of the samples around it (a few points either side, so
// even sparse samples count), then respaces. Repeating lets the line settle onto the samples.
function fitToSamples(seed, samples, closed, maxOffset, iterations) {
  let points = seed
  const clampIndex = (i) =>
    closed ? (i + points.length) % points.length : Math.max(0, Math.min(points.length - 1, i))
  for (let it = 0; it < iterations; it++) {
    const index = segmentIndex(points, closed)
    const bins = points.map(() => [])
    for (const [x, y] of samples) {
      const pr = project(index, x, y)
      if (pr && Math.abs(pr.lat) <= maxOffset) bins[nearestIndex(pr, points.length)].push(pr.lat)
    }
    points = points.map((p, i) => {
      const window = []
      for (let k = -3; k <= 3; k++) window.push(...bins[clampIndex(i + k)])
      if (window.length < 3) return p
      const a = points[clampIndex(i - 1)]
      const b = points[clampIndex(i + 1)]
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
      const offset = median(window)
      return [p[0] - ((b[1] - a[1]) / length) * offset, p[1] + ((b[0] - a[0]) / length) * offset]
    })
    points = resample(points, STEP, closed)
  }
  return points
}

// Median height of the samples near each point, filling any gaps from the nearest point with data
function heights(points, samples, closed) {
  const index = segmentIndex(points, closed)
  const bins = points.map(() => [])
  for (const [x, y, z] of samples) {
    const pr = project(index, x, y)
    if (pr && pr.d < 100) bins[nearestIndex(pr, points.length)].push(z)
  }
  const z = bins.map((b) => (b.length ? median(b) : null))
  return z.map((value, i) => {
    if (value !== null) return value
    for (let k = 1; k < z.length; k++) {
      const near = z[(i + k) % z.length] ?? z[(i - k + z.length) % z.length]
      if (near !== null && near !== undefined) return near
    }
    return 0
  })
}

const pathLength = (points, closed) => {
  let total = 0
  const count = closed ? points.length : points.length - 1
  for (let i = 0; i < count; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    total += Math.hypot(b[0] - a[0], b[1] - a[1])
  }
  return total
}

// Distance along a closed outline from index a forward to index b
const alongTrack = (cumulative, total, a, b) => {
  const d = cumulative[b] - cumulative[a]
  return d >= 0 ? d : d + total
}

// --- session ---

// A car's position at a moment, interpolated between its samples (null across gaps over 1.5s)
function positionAt(tracks, car, utcMs) {
  const track = tracks[car]
  if (!track || utcMs < track[0][0] || utcMs > track[track.length - 1][0]) return null
  let lo = 0
  let hi = track.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (track[mid][0] <= utcMs) lo = mid
    else hi = mid
  }
  const a = track[lo]
  const b = track[hi]
  if (b[0] - a[0] > 1500) return null
  const f = (utcMs - a[0]) / (b[0] - a[0] || 1)
  return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f]
}

// Lap completions, sector and minisector crossings, and pit visits, at publish time
function readTiming(timing) {
  const laps = [] // { car, utcMs, ms } ms = lap time, when the patch carries one
  const crossings = [] // { car, utcMs, key } key = 's1' | 's2' | 'sector.segment'
  const pitVisits = {} // car -> [[inUtc, outUtc]]
  const segmentCounts = [0, 0, 0]
  const lapCount = {}
  const inPitSince = {}
  const pitFlags = {}

  for (const { utcMs, lines } of timing) {
    for (const [car, line] of Object.entries(lines)) {
      const flags = (pitFlags[car] ??= {})
      if (line.InPit !== undefined) {
        flags.InPit = line.InPit
        if (line.InPit && inPitSince[car] === undefined) inPitSince[car] = utcMs
        if (!line.InPit && inPitSince[car] !== undefined) {
          ;(pitVisits[car] ??= []).push([inPitSince[car], utcMs])
          delete inPitSince[car]
        }
      }
      if (line.PitOut !== undefined) flags.PitOut = line.PitOut

      if (line.NumberOfLaps !== undefined) {
        if (lapCount[car] !== undefined && line.NumberOfLaps === lapCount[car] + 1) {
          laps.push({ car, utcMs, ms: lapTimeMs(line.LastLapTime?.Value), inPit: !!flags.InPit })
        }
        lapCount[car] = line.NumberOfLaps
      }

      const sectors = line.Sectors
      if (!sectors || flags.InPit || flags.PitOut) continue
      // An empty Value is the previous lap's time being cleared, not a crossing
      if (sectors[0]?.Value) crossings.push({ car, utcMs, key: 's1' })
      if (sectors[1]?.Value) crossings.push({ car, utcMs, key: 's2' })
      // One crossing per patch; the lap-start reset zeroes the rest in the same patch as the first
      const crossed = []
      for (const [si, sector] of Object.entries(sectors)) {
        for (const [sj, segment] of Object.entries(sector?.Segments ?? {})) {
          segmentCounts[si] = Math.max(segmentCounts[si] ?? 0, Number(sj) + 1)
          if (segment?.Status && !PIT_STATUSES.has(segment.Status)) crossed.push(`${si}.${sj}`)
        }
      }
      if (crossed.length === 1) crossings.push({ car, utcMs, key: crossed[0] })
    }
  }
  return { laps, crossings, pitVisits, segmentCounts }
}

// The publish lag that pulls every line's crossings tightest
function fitTimingOffset(tracks, crossings) {
  const spreadAt = (offset) => {
    const groups = {}
    for (const c of crossings) {
      const p = positionAt(tracks, c.car, c.utcMs - offset)
      if (p) (groups[c.key] ??= []).push(p)
    }
    const spreads = Object.values(groups)
      .filter((g) => g.length >= 10)
      .map((g) => {
        const cx = median(g.map((p) => p[0]))
        const cy = median(g.map((p) => p[1]))
        return median(g.map((p) => Math.hypot(p[0] - cx, p[1] - cy)))
      })
    return spreads.length ? spreads.reduce((a, b) => a + b) / spreads.length : Infinity
  }
  let best = { offset: 0, spread: Infinity }
  for (let offset = 0; offset <= 6000; offset += 50) {
    const spread = spreadAt(offset)
    if (spread < best.spread) best = { offset, spread }
  }
  for (let offset = best.offset - 40; offset <= best.offset + 40; offset += 10) {
    const spread = spreadAt(offset)
    if (spread < best.spread) best = { offset, spread }
  }
  return best
}

// --- pit lane ---

// Cubic Hermite curve between two points with given tangents, excluding both ends
function hermite(p0, t0, p1, t1, count) {
  const out = []
  for (let k = 1; k < count; k++) {
    const u = k / count
    const h00 = 2 * u ** 3 - 3 * u ** 2 + 1
    const h10 = u ** 3 - 2 * u ** 2 + u
    const h01 = -2 * u ** 3 + 3 * u ** 2
    const h11 = u ** 3 - u ** 2
    out.push([
      h00 * p0[0] + h10 * t0[0] + h01 * p1[0] + h11 * t1[0],
      h00 * p0[1] + h10 * t0[1] + h01 * p1[1] + h11 * t1[1]
    ])
  }
  return out
}

const unit = (dx, dy) => {
  const length = Math.hypot(dx, dy) || 1
  return [dx / length, dy / length]
}

// The point a given distance along the outline from a projection: negative is upstream
function alongOutline(outline, pr, distance) {
  const count = outline.length
  const a = outline[pr.i]
  const b = outline[(pr.i + 1) % count]
  let p = [a[0] + (b[0] - a[0]) * pr.f, a[1] + (b[1] - a[1]) * pr.f]
  let i = distance < 0 ? pr.i : (pr.i + 1) % count
  let left = Math.abs(distance)
  for (let guard = 0; guard < count && left > 0; guard++) {
    const next = outline[i]
    const length = Math.hypot(next[0] - p[0], next[1] - p[1])
    if (length >= left) {
      const r = left / (length || 1)
      return [p[0] + (next[0] - p[0]) * r, p[1] + (next[1] - p[1]) * r]
    }
    left -= length
    p = next
    i = distance < 0 ? (i - 1 + count) % count : (i + 1) % count
  }
  return p
}

function buildPitLane(tracks, pitVisits, offset, outline, outlineIndex) {
  const offTrack = (x, y) => {
    const pr = project(outlineIndex, x, y)
    return !pr || pr.d > ON_TRACK
  }

  // Each visit: from where the car left the track line to where it rejoined, moving samples only.
  // The InPit flag only covers the speed-limited lane, so the entry and exit roads come from
  // extending the visit while the car is off the track line.
  const visits = []
  for (const [car, intervals] of Object.entries(pitVisits)) {
    const track = tracks[car]
    if (!track) continue
    for (const [inUtc, outUtc] of intervals) {
      let i = track.findIndex((s) => s[0] >= inUtc - offset)
      let j = track.findIndex((s) => s[0] > outUtc - offset)
      if (i < 0 || j < 0) continue
      const limit = 30000 // Don't wander further than 30s either way
      const from = track[i][0]
      const to = track[j][0]
      while (i > 0 && from - track[i - 1][0] < limit && offTrack(track[i - 1][1], track[i - 1][2])) i--
      while (j < track.length - 1 && track[j + 1][0] - to < limit && offTrack(track[j][1], track[j][2])) j++
      const moving = []
      for (let k = i; k <= j; k++) {
        const a = track[Math.max(i, k - 1)]
        const b = track[Math.min(j, k + 1)]
        const dt = (b[0] - a[0]) / 1000
        const speed = dt > 0 ? Math.hypot(b[1] - a[1], b[2] - a[2]) / 10 / dt : 0
        if (speed > MIN_SPEED) moving.push(track[k].slice(1))
      }
      if (moving.length > 20) visits.push(moving)
    }
  }
  if (visits.length < 5) return { pitLane: null, problem: `only ${visits.length} usable pit visits` }

  // Seed from a longer-than-typical visit, then fit every visit's samples onto it
  const byLength = [...visits].sort(
    (a, b) => pathLength(b.map((s) => [s[0], s[1]]), false) - pathLength(a.map((s) => [s[0], s[1]]), false)
  )
  const seed = byLength[Math.floor(byLength.length * 0.25)].map((s) => [s[0], s[1]])
  const samples = visits.flat()
  let lane = fitToSamples(resample(seed, STEP, false), samples, false, 120, 3)

  // F1's pit reference line can start some way off the track (15m at Austin), with nothing between,
  // so each end is joined to the track with a curve: leaving parallel to the track a little upstream
  // (or rejoining a little downstream) and meeting the lane along its own direction over ~20m
  const entry = project(outlineIndex, ...lane[0])
  const exit = project(outlineIndex, ...lane[lane.length - 1])
  if (!entry || !exit) return { pitLane: null, problem: 'pit lane ends are nowhere near the track' }
  const trackDirection = (p) => {
    const pr = project(outlineIndex, ...p)
    const a = outline[pr.i]
    const b = outline[(pr.i + 1) % outline.length]
    return { dir: unit(b[0] - a[0], b[1] - a[1]), pr }
  }
  const reach = 4 // points, ~20m
  const entryAt = alongOutline(outline, entry, -Math.max(2 * entry.d, 200))
  const exitAt = alongOutline(outline, exit, Math.max(2 * exit.d, 200))
  const entryTrack = trackDirection(entryAt)
  const exitTrack = trackDirection(exitAt)
  const laneIn = unit(lane[reach][0] - lane[0][0], lane[reach][1] - lane[0][1])
  const last = lane.length - 1
  const laneOut = unit(lane[last][0] - lane[last - reach][0], lane[last][1] - lane[last - reach][1])
  const entryLength = Math.hypot(lane[0][0] - entryAt[0], lane[0][1] - entryAt[1])
  const exitLength = Math.hypot(exitAt[0] - lane[last][0], exitAt[1] - lane[last][1])
  lane = [
    entryAt,
    ...hermite(entryAt, entryTrack.dir.map((v) => v * entryLength), lane[0], laneIn.map((v) => v * entryLength), 8),
    ...lane,
    ...hermite(lane[last], laneOut.map((v) => v * exitLength), exitAt, exitTrack.dir.map((v) => v * exitLength), 8),
    exitAt
  ]
  lane = resample(lane, STEP, false)

  const z = heights(lane, samples, false)
  const lengthKm = pathLength(lane, false) / 10000
  return {
    pitLane: {
      positions: lane.map(([x, y], i) => ({ x: Math.round(x), y: Math.round(y), z: Math.round(z[i]) })),
      entry_index: nearestIndex(entryTrack.pr, outline.length),
      exit_index: nearestIndex(exitTrack.pr, outline.length)
    },
    stats: { visits: visits.length, lengthKm, entryGapM: entry.d / 10, exitGapM: exit.d / 10 },
    problem: lengthKm < PIT_KM[0] || lengthKm > PIT_KM[1] ? `pit lane is ${lengthKm.toFixed(2)}km` : null
  }
}

// --- orientation ---

// Degrees to turn the map anticlockwise (after flipping y for the screen) so it's widest across, with
// the start line in the lower half. Must match toScreen in TrackMap.tsx.
function landscapeRotation(outline) {
  const shape = (degrees) => {
    const a = (-degrees * Math.PI) / 180
    const cos = Math.cos(a)
    const sin = Math.sin(a)
    const pts = outline.map(([x, y]) => [x * cos + y * sin, x * sin - y * cos])
    const ys = pts.map((p) => p[1])
    const xs = pts.map((p) => p[0])
    const height = Math.max(...ys) - Math.min(...ys)
    const width = Math.max(...xs) - Math.min(...xs)
    return { ratio: height / width, startLow: pts[0][1] > (Math.max(...ys) + Math.min(...ys)) / 2 }
  }
  let best = 0
  let bestRatio = Infinity
  for (let degrees = 0; degrees < 180; degrees++) {
    const { ratio } = shape(degrees)
    if (ratio < bestRatio) {
      bestRatio = ratio
      best = degrees
    }
  }
  return shape(best).startLow ? best : best + 180
}

// --- the whole map ---

/**
 * Returns { map, stats, problems }. map is null when the outline itself can't be trusted; otherwise
 * problems lists anything left out (sectors, minisectors, pit lane) and why.
 */
function buildTrackMap({ tracks, timing }) {
  const problems = []
  const { laps, crossings, pitVisits, segmentCounts } = readTiming(timing)

  const fit = fitTimingOffset(tracks, crossings)
  const offset = fit.offset
  if (!(fit.spread <= MAX_OFFSET_SPREAD)) {
    return { map: null, problems: [`no clear timing offset (lines spread ${(fit.spread / 10).toFixed(1)}m)`] }
  }

  // Five fastest drivers, each with their best timed lap
  const best = {}
  for (const lap of laps) {
    if (lap.ms && !lap.inPit && (!best[lap.car] || lap.ms < best[lap.car].ms)) best[lap.car] = lap
  }
  const top = Object.values(best)
    .sort((a, b) => a.ms - b.ms)
    .slice(0, 5)
  if (top.length < 3) return { map: null, problems: ['fewer than 3 timed laps'] }
  const lapSamples = top.flatMap((lap) =>
    tracks[lap.car].filter((s) => s[0] >= lap.utcMs - offset - lap.ms && s[0] <= lap.utcMs - offset).map((s) => s.slice(1))
  )

  // Outline: the fastest lap as a guide, then fitted to all five
  const fastest = top[0]
  const seed = tracks[fastest.car]
    .filter((s) => s[0] >= fastest.utcMs - offset - fastest.ms && s[0] <= fastest.utcMs - offset)
    .map((s) => [s[1], s[2]])
  if (seed.length < 100) return { map: null, problems: ['fastest lap has too few position samples'] }
  let outline = fitToSamples(resample(seed, STEP, true), lapSamples, true, 150, 3)

  // Start at the finish line: the median spot where lap completions happen
  const linePoints = laps
    .filter((lap) => !lap.inPit)
    .map((lap) => positionAt(tracks, lap.car, lap.utcMs - offset))
    .filter(Boolean)
  const finish = [median(linePoints.map((p) => p[0])), median(linePoints.map((p) => p[1]))]
  const finishSpread = median(linePoints.map((p) => Math.hypot(p[0] - finish[0], p[1] - finish[1])))
  let startIdx = 0
  outline.forEach((p, i) => {
    if (Math.hypot(p[0] - finish[0], p[1] - finish[1]) < Math.hypot(outline[startIdx][0] - finish[0], outline[startIdx][1] - finish[1])) startIdx = i
  })
  outline = [...outline.slice(startIdx), ...outline.slice(0, startIdx)]

  const lapKm = pathLength(outline, true) / 10000
  if (lapKm < LAP_KM[0] || lapKm > LAP_KM[1]) return { map: null, problems: [`lap is ${lapKm.toFixed(2)}km`] }
  const outlineIndex = segmentIndex(outline, true)
  const count = outline.length
  const cumulative = [0]
  for (let i = 1; i < count; i++) {
    cumulative.push(cumulative[i - 1] + Math.hypot(outline[i][0] - outline[i - 1][0], outline[i][1] - outline[i - 1][1]))
  }
  const total = pathLength(outline, true)

  // Lines: where cars are on the outline when they finish each sector or minisector
  const hits = {}
  for (const c of crossings) {
    const p = positionAt(tracks, c.car, c.utcMs - offset)
    const pr = p && project(outlineIndex, p[0], p[1])
    if (pr && pr.d < 150) (hits[c.key] ??= []).push(nearestIndex(pr, count))
  }
  const spread = (h, lo, hi) => alongTrack(cumulative, total, quantile(h, lo), quantile(h, hi))
  let sectors = null
  const s1 = hits.s1 ?? []
  const s2 = hits.s2 ?? []
  if (s1.length < MIN_CROSSINGS || s2.length < MIN_CROSSINGS) {
    problems.push('too few sector crossings')
  } else if (spread(s1, 0.1, 0.9) > MAX_LINE_SPREAD || spread(s2, 0.1, 0.9) > MAX_LINE_SPREAD) {
    problems.push('sector crossings too spread out')
  } else {
    const starts = [0, median(s1), median(s2)]
    if (!(starts[1] > 0 && starts[2] > starts[1])) {
      problems.push('sector lines out of order')
    } else {
      // Minisector j of a sector starts where j - 1 ended; the last one ends at the next sector line
      const ends = [...starts.slice(1), count]
      let minisectors = segmentCounts.map((segments, si) => {
        const list = [starts[si]]
        for (let sj = 0; sj < segments - 1; sj++) {
          const h = hits[`${si}.${sj}`] ?? []
          if (h.length < MIN_CROSSINGS || spread(h, 0.25, 0.75) > MAX_MINISECTOR_IQR) return null
          list.push(median(h))
        }
        return list.every((s, k) => k === 0 || (s > list[k - 1] && s < ends[si])) ? list : null
      })
      if (minisectors.some((m) => m === null)) {
        problems.push('minisectors left out: some crossings too few, spread out or out of order')
        minisectors = null
      }
      sectors = { starts, minisectors }
    }
  }

  const pit = buildPitLane(tracks, pitVisits, offset, outline, outlineIndex)
  if (pit.problem) problems.push(pit.problem)

  const z = heights(outline, lapSamples, true)
  const map = {
    positions: outline.map(([x, y], i) => ({ x: Math.round(x), y: Math.round(y), z: Math.round(z[i]) })),
    start_index: 0,
    sectors,
    pit_lane: pit.problem ? null : pit.pitLane,
    rotation: landscapeRotation(outline)
  }
  return {
    map,
    top,
    problems,
    stats: {
      offsetMs: offset,
      lineSpreadM: fit.spread / 10,
      finishSpreadM: finishSpread / 10,
      lapKm,
      minisectors: sectors?.minisectors ? segmentCounts.join('+') : null,
      pit: pit.stats ?? null
    }
  }
}

/**
 * A pit lane traced from a different session onto an outline that's already built. For sessions
 * whose own pit data is unusable (Shanghai 2026 freezes positions in the pit lane); F1's position
 * frame is the same from season to season, so another year's qualifying lines up.
 */
function pitLaneFor({ tracks, timing }, positions) {
  const { crossings, pitVisits } = readTiming(timing)
  const fit = fitTimingOffset(tracks, crossings)
  if (!(fit.spread <= MAX_OFFSET_SPREAD)) return { pitLane: null, problem: 'no clear timing offset' }
  const outline = positions.map((p) => [p.x, p.y])
  return buildPitLane(tracks, pitVisits, fit.offset, outline, segmentIndex(outline, true))
}

module.exports = { buildTrackMap, pitLaneFor }
