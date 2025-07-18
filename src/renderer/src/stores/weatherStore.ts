import { create } from 'zustand'
import { WeatherData } from '../types/liveTimingTypes'

interface WeatherState extends WeatherData {
  updateWeather: (weatherData: WeatherData) => void
}

export const useWeatherStore = create<WeatherState>((set) => ({
  AirTemp: '0',
  Humidity: '0',
  Pressure: '0',
  Rainfall: '0',
  TrackTemp: '0',
  WindDirection: '0',
  WindSpeed: '0',
  _kf: false,
  updateWeather: (weatherData: WeatherData) =>
    set(() => ({
      AirTemp: weatherData.AirTemp,
      Humidity: weatherData.Humidity,
      Pressure: weatherData.Pressure,
      Rainfall: weatherData.Rainfall,
      TrackTemp: weatherData.TrackTemp,
      WindDirection: weatherData.WindDirection,
      WindSpeed: weatherData.WindSpeed,
      _kf: weatherData._kf
    }))
}))
