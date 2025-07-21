import { create } from 'zustand'
import { WeatherData } from '../types/liveTimingTypes'

interface WeatherHistoryEntry extends WeatherData {
  timestamp: number
}

interface WeatherState extends WeatherData {
  history: WeatherHistoryEntry[]
  updateWeather: (weatherData: WeatherData) => void
  getHistoryForField: (field: keyof WeatherData) => { timestamp: number; value: string }[]
}

export const useWeatherStore = create<WeatherState>((set, get) => ({
  AirTemp: '0',
  Humidity: '0',
  Pressure: '0',
  Rainfall: '0',
  TrackTemp: '0',
  WindDirection: '0',
  WindSpeed: '0',
  _kf: false,
  history: [],
  updateWeather: (weatherData: WeatherData) =>
    set((state) => {
      const timestamp = Date.now()
      const newEntry: WeatherHistoryEntry = {
        ...weatherData,
        timestamp
      }

      return {
        AirTemp: weatherData.AirTemp,
        Humidity: weatherData.Humidity,
        Pressure: weatherData.Pressure,
        Rainfall: weatherData.Rainfall,
        TrackTemp: weatherData.TrackTemp,
        WindDirection: weatherData.WindDirection,
        WindSpeed: weatherData.WindSpeed,
        _kf: weatherData._kf,
        history: [...state.history, newEntry].slice(-100)
      }
    }),
  getHistoryForField: (field: keyof WeatherData) => {
    const state = get()
    return state.history
      .filter((entry) => entry[field] !== undefined && entry[field] !== '0')
      .map((entry) => ({
        timestamp: entry.timestamp,
        value: entry[field] as string
      }))
  }
}))
