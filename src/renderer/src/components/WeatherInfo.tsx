import React from 'react'
import { useWeatherStore } from '@renderer/stores/weatherStore'
import { CloudRainWind, Sun } from 'lucide-react'

function toFahrenheit(celsius: string): string {
  return `${((Number(celsius) * 9) / 5 + 32).toFixed(0)}°F`
}

function Reading({
  label,
  value,
  className = ''
}: {
  label: string
  value: string
  className?: string
}): React.JSX.Element {
  return (
    <div className={`flex items-baseline gap-1 whitespace-nowrap ${className}`}>
      <span className="text-[11px] text-ink-3">{label}</span>
      <span className="text-xs font-medium text-ink tabular-nums">{value}</span>
    </div>
  )
}

export default function WeatherInfo(): React.JSX.Element | null {
  const weather = useWeatherStore()

  // The store seeds every reading with '0' until the first update arrives
  if (weather.history.length === 0) return null

  const raining = Number(weather.Rainfall) === 1

  return (
    <div className="flex flex-row items-center gap-3">
      <Reading label="Air" value={toFahrenheit(weather.AirTemp)} />
      <Reading label="Track" value={toFahrenheit(weather.TrackTemp)} />
      <Reading
        label="Hum"
        value={`${Number(weather.Humidity).toFixed(0)}%`}
        className="hidden 2xl:flex"
      />
      <Reading label="Wind" value={`${weather.WindSpeed} m/s`} className="hidden xl:flex" />
      <div className="flex items-center gap-1 text-xs font-medium whitespace-nowrap text-ink">
        {raining ? (
          <CloudRainWind className="h-3.5 w-3.5 text-tyre-wet" />
        ) : (
          <Sun className="h-3.5 w-3.5 text-ink-2" />
        )}
        {raining ? 'Rain' : 'Dry'}
      </div>
    </div>
  )
}
