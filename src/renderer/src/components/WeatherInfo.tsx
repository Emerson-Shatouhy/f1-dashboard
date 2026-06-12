import React from 'react'
import { useWeatherStore } from '@renderer/stores/weatherStore'
import { CloudRainWind, Sun, Thermometer, Droplet, Wind } from 'lucide-react'

export default function WeatherInfo(): React.JSX.Element {
  const weather = useWeatherStore()

  // Convert temps to ferrenheit if needed
  function toFahrenheit(celsius: number): string {
    return ((celsius * 9) / 5 + 32).toFixed(1)
  }

  return (
    <div className="flex flex-row items-center gap-4">
      <div className="flex items-center gap-1.5">
        <Thermometer className="w-3.5 h-3.5 text-red-400" />
        <span className="text-sm font-semibold text-gray-300">{toFahrenheit(Number(weather.AirTemp))}°F</span>
        <span className="text-xs text-gray-500">air</span>
      </div>

      <div className="flex items-center gap-1.5">
        <Thermometer className="w-3.5 h-3.5 text-orange-400" />
        <span className="text-sm font-semibold text-gray-300">{toFahrenheit(Number(weather.TrackTemp))}°F</span>
        <span className="text-xs text-gray-500">track</span>
      </div>

      <div className="flex items-center gap-1.5">
        <Droplet className="w-3.5 h-3.5 text-blue-400" />
        <span className="text-sm font-semibold text-gray-300">{weather.Humidity}%</span>
      </div>

      <div className="flex items-center gap-1.5">
        <Wind className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-sm font-semibold text-gray-300">{weather.WindSpeed} m/s</span>
      </div>

      <div className="flex items-center gap-1.5">
        {Number(weather.Rainfall) === 1 ? (
          <CloudRainWind className="w-3.5 h-3.5 text-blue-400" />
        ) : (
          <Sun className="w-3.5 h-3.5 text-yellow-400" />
        )}
        <span className="text-sm font-semibold text-gray-300">
          {Number(weather.Rainfall) === 1 ? 'Rain' : 'Dry'}
        </span>
      </div>
    </div>
  )
}
