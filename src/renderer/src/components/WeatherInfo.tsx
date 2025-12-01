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
    <div className="flex flex-row justify-between items-center gap-5">
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-2">
          <Thermometer className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-red-400" />
          <div className="text-base sm:text-lg lg:text-xl xl:text-2xl font-semibold text-gray-300">
            {toFahrenheit(Number(weather.AirTemp))} °F
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center">
        <div className="flex items-center gap-2">
          <Thermometer className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-orange-400" />
          <div className="text-base sm:text-lg lg:text-xl xl:text-2xl font-semibold text-gray-300">
            {toFahrenheit(Number(weather.TrackTemp))} °F
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center">
        <div className="flex items-center gap-2">
          <Droplet className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-400" />
          <div className="text-base sm:text-lg lg:text-xl xl:text-2xl font-semibold text-gray-300">
            {weather.Humidity}%
          </div>
        </div>
      </div>

      {/* <div className="flex flex-col items-center">
        <div className="text-sm font-semibold text-gray-300">{weather.Pressure}</div>
        <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Pressure</div>
      </div> */}

      <div className="flex flex-col items-center">
        <div className="flex items-center gap-2">
          <Wind className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-gray-400" />
          <div className="text-base sm:text-lg lg:text-xl xl:text-2xl font-semibold text-gray-300">
            {weather.WindSpeed} m/s
          </div>
        </div>
      </div>
      {/* 
      <div className="flex flex-col items-center">
        <div className="text-sm font-semibold text-gray-300">{weather.Rainfall} mm</div>
        <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Rainfall</div>
      </div> */}
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-2">
          {Number(weather.Rainfall) === 1 ? (
            <CloudRainWind className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-gray-400" />
          ) : (
            <Sun className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-yellow-400" />
          )}
          <div className="text-base sm:text-lg lg:text-xl xl:text-2xl font-semibold text-gray-300">
            {Number(weather.Rainfall) === 1 ? 'Rain' : 'Dry'}
          </div>
        </div>
      </div>
    </div>
  )
}
