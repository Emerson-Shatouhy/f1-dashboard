import React from 'react'
import { useWeatherStore } from '@renderer/stores/weatherStore'
import { CloudRainWind, Sun } from 'lucide-react'

export default function WeatherInfo(): React.JSX.Element {
  const weather = useWeatherStore()

  // Turn wind direction into N/NE/E/SE/S/SW/W/NW
  const windDirection = weather.WindDirection
    ? `${Math.round((Number(weather.WindDirection) / 360) * 8) * 45}°`
    : 'N/A'

  // Convert temps to ferrenheit if needed
  function toFahrenheit(celsius: number): string {
    return ((celsius * 9) / 5 + 32).toFixed(1)
  }

  const windDirectionText = (() => {
    switch (windDirection) {
      case '0°':
        return 'N'
      case '45°':
        return 'NE'
      case '90°':
        return 'E'
      case '135°':
        return 'SE'
      case '180°':
        return 'S'
      case '225°':
        return 'SW'
      case '270°':
        return 'W'
      case '315°':
        return 'NW'
      default:
        return 'N/A'
    }
  })()

  return (
    <div className="flex flex-row justify-between items-center gap-5">
      <div className="flex flex-col items-center">
        <div className="text-xl font-bold">{toFahrenheit(Number(weather.AirTemp))} °F</div>
        <div className="text-lg text-gray-300">Air Temp</div>
      </div>

      <div className="flex flex-col items-center">
        <div className="text-xl font-bold">{toFahrenheit(Number(weather.TrackTemp))} °F</div>
        <div className="text-lg text-gray-300">Track Temp</div>
      </div>

      <div className="flex flex-col items-center">
        <div className="text-xl font-bold">{weather.Humidity}%</div>
        <div className="text-lg text-gray-300">Humidity</div>
      </div>

      {/* <div className="flex flex-col items-center">
        <div className="text-xl font-bold">{weather.Pressure}</div>
        <div className="text-lg text-gray-300">Pressure</div>
      </div> */}

      <div className="flex flex-col items-center">
        <div className="text-xl font-bold">{weather.WindSpeed} m/s</div>
        <div className="text-lg text-gray-300">{windDirectionText}</div>
      </div>
      {/* 
      <div className="flex flex-col items-center">
        <div className="text-xl font-bold">{weather.Rainfall} mm</div>
        <div className="text-lg text-gray-300">Rainfall</div>
      </div> */}
      <div className="flex flex-col items-center p-2">
        {Number(weather.Rainfall) === 1 ? <CloudRainWind size={35} /> : <Sun size={35} />}
      </div>
    </div>
  )
}
