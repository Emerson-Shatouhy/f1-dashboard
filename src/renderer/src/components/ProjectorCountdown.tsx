import React, { useState, useEffect, useMemo } from 'react'
import { useJolpicaStore } from '@renderer/stores/jolpicaStore'
import type { JolpicaRace, JolpicaSessionTime } from '@renderer/types/jolpicaTypes'

// ── Flag colours keyed by Jolpica country name ───────────────────────────────
const FLAG_COLORS: Record<string, [string, string, string]> = {
  Australia:       ['#FFD700', '#00843D', '#002868'],
  Bahrain:         ['#CE1126', '#CE1126', '#FFFFFF'],
  'Saudi Arabia':  ['#006C35', '#006C35', '#FFFFFF'],
  Japan:           ['#BC002D', '#BC002D', '#FFFFFF'],
  China:           ['#DE2910', '#DE2910', '#FFDE00'],
  'United States': ['#B22234', '#3C3B6E', '#FFFFFF'],
  Italy:           ['#009246', '#CE2B37', '#FFFFFF'],
  Monaco:          ['#CE1126', '#CE1126', '#FFFFFF'],
  Canada:          ['#FF0000', '#FF0000', '#FFFFFF'],
  Spain:           ['#AA151B', '#F1BF00', '#AA151B'],
  Austria:         ['#ED2939', '#ED2939', '#FFFFFF'],
  'United Kingdom':['#C8102E', '#012169', '#FFFFFF'],
  Hungary:         ['#CE2939', '#436F4D', '#FFFFFF'],
  Belgium:         ['#EF3340', '#FAE042', '#000000'],
  Netherlands:     ['#AE1C28', '#21468B', '#FFFFFF'],
  Azerbaijan:      ['#0092BC', '#EF3340', '#00B140'],
  Singapore:       ['#EF3340', '#EF3340', '#FFFFFF'],
  Mexico:          ['#006847', '#CE1126', '#FFFFFF'],
  Brazil:          ['#009C3B', '#FFDF00', '#002776'],
  Qatar:           ['#8D1B3D', '#8D1B3D', '#FFFFFF'],
  'United Arab Emirates': ['#00732F', '#FF0000', '#000000'],
}

const DEFAULT_COLORS: [string, string, string] = ['#E10600', '#1E1E1E', '#FFFFFF']

function getFlagColors(country: string): [string, string, string] {
  return FLAG_COLORS[country] ?? DEFAULT_COLORS
}

// ── Session helpers ───────────────────────────────────────────────────────────
interface SessionEntry {
  name: string
  date: Date
}

function getSessionsForRace(race: JolpicaRace): SessionEntry[] {
  const entries: SessionEntry[] = []
  const add = (name: string, s?: JolpicaSessionTime): void => {
    if (!s) return
    entries.push({ name, date: new Date(`${s.date}T${s.time}`) })
  }
  add('Practice 1', race.FirstPractice)
  add('Practice 2', race.SecondPractice)
  add('Practice 3', race.ThirdPractice)
  add('Sprint Qualifying', race.SprintQualifying)
  add('Sprint', race.Sprint)
  add('Qualifying', race.Qualifying)
  if (race.time) entries.push({ name: 'Race', date: new Date(`${race.date}T${race.time}`) })
  return entries.sort((a, b) => a.date.getTime() - b.date.getTime())
}

function getNextSession(race: JolpicaRace): SessionEntry | null {
  const now = new Date()
  return getSessionsForRace(race).find((s) => s.date > now) ?? null
}

// ── Countdown helpers ─────────────────────────────────────────────────────────
interface CountdownParts {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function computeCountdown(target: Date): CountdownParts {
  const diff = Math.max(0, target.getTime() - Date.now())
  const total = Math.floor(diff / 1000)
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  }
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

// ── Countdown unit ────────────────────────────────────────────────────────────
function CountdownUnit({ value, label }: { value: number; label: string }): React.JSX.Element {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <div className="absolute inset-0 rounded-2xl bg-red-600/10 blur-xl scale-110" />
        <div className="relative px-8 py-6 rounded-2xl bg-black/40 border border-white/10 shadow-2xl min-w-[140px] backdrop-blur-sm">
          <span className="block font-mono font-black text-8xl text-white tracking-tighter tabular-nums leading-none text-center">
            {pad(value)}
          </span>
        </div>
      </div>
      <span className="text-xs font-bold uppercase tracking-[0.3em] text-white">{label}</span>
    </div>
  )
}

// ── Animated flag background ──────────────────────────────────────────────────
// Keyframes are defined in main.css (stripe-drift, color-breathe, scan-line)
function FlagBackground({ colors }: { colors: [string, string, string] }): React.JSX.Element {
  const [c1, c2, c3] = colors
  // Diagonal repeating stripes — tile is 600px so we drift one full tile
  const stripePattern = `repeating-linear-gradient(
    135deg,
    ${c1} 0px,   ${c1} 180px,
    ${c2} 180px, ${c2} 360px,
    ${c3} 360px, ${c3} 540px
  )`

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Scrolling stripe layer */}
      <div
        style={{
          position: 'absolute',
          top: '-600px',
          left: '-600px',
          right: '-600px',
          bottom: '-600px',
          background: stripePattern,
          animationName: 'stripe-drift',
          animationDuration: '12s',
          animationTimingFunction: 'linear',
          animationIterationCount: 'infinite',
        }}
      />

      {/* Breathing opacity overlay to add pulse */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: stripePattern,
          animationName: 'color-breathe',
          animationDuration: '3s',
          animationTimingFunction: 'ease-in-out',
          animationIterationCount: 'infinite',
          mixBlendMode: 'overlay',
        }}
      />

      {/* Dark center vignette so text stays readable */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0.1) 80%, transparent 100%)',
        }}
      />

      {/* Scan line sweep */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: '6px',
          background: `linear-gradient(90deg, transparent, #ffffff, transparent)`,
          animationName: 'scan-line',
          animationDuration: '5s',
          animationTimingFunction: 'linear',
          animationIterationCount: 'infinite',
        }}
      />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function ProjectorCountdown(): React.JSX.Element {
  const { nextRace, nextRaceStatus, fetchNextRace: doFetch } = useJolpicaStore()
  const [nextSession, setNextSession] = useState<SessionEntry | null>(null)
  const [countdown, setCountdown] = useState<CountdownParts>({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [tick, setTick] = useState(false)

  useEffect(() => {
    if (nextRaceStatus === 'idle') doFetch()
  }, [nextRaceStatus, doFetch])

  useEffect(() => {
    if (!nextRace) return
    setNextSession(getNextSession(nextRace))
  }, [nextRace])

  useEffect(() => {
    if (!nextSession) return
    const update = (): void => {
      setCountdown(computeCountdown(nextSession.date))
      setTick((t) => !t)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [nextSession])

  const country = nextRace?.Circuit.Location.country ?? ''
  const flagColors = useMemo(() => getFlagColors(country), [country])

  const raceName = nextRace?.raceName ?? ''
  const location = nextRace
    ? `${nextRace.Circuit.Location.locality}, ${country}`
    : ''
  const sessionLabel = nextSession?.name ?? ''
  const isLoading = nextRaceStatus === 'loading' || nextRaceStatus === 'idle'

  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full min-h-0 overflow-hidden bg-gray-950 select-none">
      <FlagBackground colors={flagColors} />

      {isLoading ? (
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-white text-sm tracking-widest uppercase">Loading schedule…</span>
        </div>
      ) : (
        <div className="relative z-10 flex flex-col items-center gap-8 px-8 w-full">
          {/* Header label */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-red-500" />
              <span className="text-xs font-bold uppercase tracking-[0.4em] text-red-400">
                Next Session
              </span>
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-red-500" />
            </div>

            {sessionLabel && (
              <div className="px-8 py-3 rounded-full bg-black/30 border border-white/20 backdrop-blur-sm">
                <span className="text-white font-bold text-3xl uppercase tracking-widest">
                  {sessionLabel}
                </span>
              </div>
            )}
          </div>

          {/* Race name */}
          <div className="flex flex-col items-center gap-3 text-center">
            <h1 className="text-6xl font-black uppercase tracking-wide text-white leading-tight drop-shadow-lg">
              {raceName}
            </h1>
            {location && (
              <p className="text-white text-2xl tracking-widest uppercase drop-shadow">{location}</p>
            )}
          </div>

          {/* Countdown digits */}
          <div className="flex items-start gap-4">
            <CountdownUnit value={countdown.days} label="Days" />
            <div className="flex items-center pb-12">
              <span className={`font-black text-7xl text-white transition-opacity duration-100 ${tick ? 'opacity-100' : 'opacity-30'}`}>:</span>
            </div>
            <CountdownUnit value={countdown.hours} label="Hours" />
            <div className="flex items-center pb-12">
              <span className={`font-black text-7xl text-white transition-opacity duration-100 ${tick ? 'opacity-100' : 'opacity-30'}`}>:</span>
            </div>
            <CountdownUnit value={countdown.minutes} label="Minutes" />
            <div className="flex items-center pb-12">
              <span className={`font-black text-7xl text-white transition-opacity duration-100 ${tick ? 'opacity-100' : 'opacity-30'}`}>:</span>
            </div>
            <CountdownUnit value={countdown.seconds} label="Seconds" />
          </div>

          {/* Session date/time */}
          {nextSession && (
            <div className="flex items-center gap-4 text-white text-xl tracking-widest uppercase drop-shadow">
              <span>
                {nextSession.date.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              <span className="text-white/50">·</span>
              <span>
                {nextSession.date.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZoneName: 'short',
                })}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
