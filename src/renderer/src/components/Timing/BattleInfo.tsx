import React from 'react'
import { useDriverStore } from '@renderer/stores/driverStore'
import { useDriverTimingStore } from '@renderer/stores/driverTimingStore'
import { useTrackStatusStore } from '@renderer/stores/trackStatusStore'
import { getTeamColorHex } from '@renderer/utils/teamFallbacks'
import { getInterval, parseGapSeconds, parseLapSeconds } from '@renderer/utils/timing'
import type { DriverTiming } from '@renderer/types/liveTimingTypes'

// Gains under this per lap are noise from one lap's variation
const MIN_RATE = 0.05
// Sector differences smaller than this are shown neutral
const SECTOR_NOISE = 0.02
// Further away than this isn't worth showing as a "catch"
const MAX_LAPS = 60
// Slow laps under SC/VSC/red flag and in/out laps say nothing about pace
const NEUTRALISED = new Set(['4', '5', '6', '7'])

function cleanLap(timing: DriverTiming | undefined): number | null {
  if (!timing || timing.InPit || timing.PitOut) return null
  return parseLapSeconds(timing.LastLapTime?.Value)
}

interface SideProps {
  label: string
  other: DriverTiming | undefined
  gapText: string | undefined
  // Seconds per lap the chasing car gains on the one in front; negative means it loses time
  rate: number | null
  // Seconds the chasing car gained in each sector, from each car's latest clean sector time
  deltas: Array<number | null>
  // Whether this driver is the chaser; decides whether gaining time reads as good or bad
  chaserIsMe: boolean
  catching: boolean
  verb: string
  emptyText: string
}

function Side({
  label,
  other,
  gapText,
  rate,
  deltas,
  chaserIsMe,
  catching,
  verb,
  emptyText
}: SideProps): React.JSX.Element {
  const driver = useDriverStore((state) => (other ? state.Drivers[other.RacingNumber] : undefined))

  if (!other) {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[11px] text-ink-3">{label}</span>
        <span className="text-xl leading-none font-semibold text-ink-3">—</span>
        <span className="text-[11px] text-ink-3">{emptyText}</span>
      </div>
    )
  }

  const gap = parseGapSeconds(gapText)
  const lapsToCatch =
    gap !== null && rate !== null && rate > MIN_RATE ? Math.ceil(gap / rate) : null

  let detail: string
  if (rate === null) {
    detail = catching ? 'Closing' : '—'
  } else if (rate > MIN_RATE) {
    detail = `Closing ${rate.toFixed(2)}s/lap`
    if (lapsToCatch !== null && lapsToCatch <= MAX_LAPS) {
      detail += ` · ~${lapsToCatch} lap${lapsToCatch === 1 ? '' : 's'} ${verb}`
    }
  } else if (rate < -MIN_RATE) {
    detail = `Pulling away ${Math.abs(rate).toFixed(2)}s/lap`
  } else {
    detail = 'Holding'
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="flex items-center gap-1.5 text-[11px] text-ink-3">
        {label}
        <span
          className="h-[1.1em] w-[3px] rounded-full"
          style={{ backgroundColor: getTeamColorHex(driver) }}
        />
        <span className="font-semibold text-ink-2">{driver?.Tla ?? other.RacingNumber}</span>
      </span>
      <span className="text-xl leading-none font-semibold tabular-nums">{gapText || '—'}</span>
      <span className="text-[11px] text-ink-3 tabular-nums">{detail}</span>
      {deltas.some((d) => d !== null) && (
        <span className="flex gap-2 text-[10px] tabular-nums">
          {deltas.map((delta, index) => {
            const chaserGains = delta !== null && delta > SECTOR_NOISE
            const chaserLoses = delta !== null && delta < -SECTOR_NOISE
            const good = chaserIsMe ? chaserGains : chaserLoses
            const bad = chaserIsMe ? chaserLoses : chaserGains
            return (
              <span key={index} className={good ? 'text-pb' : bad ? 'text-danger' : 'text-ink-3'}>
                S{index + 1} {delta === null ? '—' : `${delta > 0 ? '+' : ''}${delta.toFixed(2)}`}
              </span>
            )
          })}
        </span>
      )}
    </div>
  )
}

// Seconds the chasing car gains on the car in front, per sector; the index is the sector
function sectorDeltas(
  slower: Array<number | undefined> | undefined,
  faster: Array<number | undefined> | undefined
): Array<number | null> {
  return [0, 1, 2].map((i) => {
    const a = slower?.[i]
    const b = faster?.[i]
    return a !== undefined && b !== undefined ? a - b : null
  })
}

export function BattleInfo({ racingNumber }: { racingNumber: string }): React.JSX.Element {
  const timings = useDriverTimingStore((state) => state.DriverTiming)
  const sectorTimes = useDriverTimingStore((state) => state.SectorTimes)
  const trackStatus = useTrackStatusStore((state) => state.trackStatus?.Status)

  const me = timings[racingNumber]
  const position = Number(me?.Position)
  const find = (p: number): DriverTiming | undefined =>
    Object.values(timings).find((t) => Number(t.Position) === p)
  const ahead = position > 1 ? find(position - 1) : undefined
  const behind = find(position + 1)

  const racing = !trackStatus || !NEUTRALISED.has(trackStatus)
  const myLap = racing ? cleanLap(me) : null
  const aheadLap = racing ? cleanLap(ahead) : null
  const behindLap = racing ? cleanLap(behind) : null

  // The chaser is the car behind: for Ahead that's me, for Behind it's the other driver
  const aheadDeltas = sectorDeltas(
    sectorTimes[ahead?.RacingNumber ?? ''],
    sectorTimes[racingNumber]
  )
  const behindDeltas = sectorDeltas(
    sectorTimes[racingNumber],
    sectorTimes[behind?.RacingNumber ?? '']
  )
  // Three fresh sectors beat last lap time: they update every sector instead of every lap
  const sumDeltas = (d: Array<number | null>): number | null =>
    d.every((x) => x !== null) ? d.reduce<number>((a, x) => a + (x as number), 0) : null
  const aheadRate =
    ahead && racing
      ? (sumDeltas(aheadDeltas) ?? (myLap !== null && aheadLap !== null ? aheadLap - myLap : null))
      : null
  const behindRate =
    behind && racing
      ? (sumDeltas(behindDeltas) ??
        (myLap !== null && behindLap !== null ? myLap - behindLap : null))
      : null

  return (
    <div className="flex gap-4">
      <Side
        label="Ahead"
        other={ahead}
        gapText={getInterval(me)}
        rate={aheadRate}
        deltas={aheadDeltas}
        chaserIsMe
        catching={!!me?.IntervalToPositionAhead?.Catching}
        verb="to catch"
        emptyText="Leading"
      />
      <Side
        label="Behind"
        other={behind}
        gapText={getInterval(behind)}
        rate={behindRate}
        deltas={behindDeltas}
        chaserIsMe={false}
        catching={!!behind?.IntervalToPositionAhead?.Catching}
        verb="until caught"
        emptyText="Last"
      />
    </div>
  )
}
