import React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'
import { WeatherData } from '@renderer/types/liveTimingTypes'

interface WeatherGraphProps {
  data: { timestamp: number; value: string }[]
  field: keyof WeatherData
  unit?: string
}

export default function WeatherGraph({
  data,
  field,
  unit = ''
}: WeatherGraphProps): React.JSX.Element {
  if (data.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 shadow-lg">
        <div className="text-center text-gray-400">No historical data available</div>
      </div>
    )
  }

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatValue = (value: string): string => {
    if (field === 'AirTemp' || field === 'TrackTemp') {
      const celsius = parseFloat(value)
      const fahrenheit = ((celsius * 9) / 5 + 32).toFixed(1)
      return `${fahrenheit}°F`
    }
    return `${value}${unit}`
  }

  const getFieldDisplayName = (field: keyof WeatherData): string => {
    switch (field) {
      case 'AirTemp':
        return 'Air Temperature'
      case 'TrackTemp':
        return 'Track Temperature'
      case 'Humidity':
        return 'Humidity'
      case 'WindSpeed':
        return 'Wind Speed'
      case 'Pressure':
        return 'Pressure'
      case 'Rainfall':
        return 'Rainfall'
      default:
        return field
    }
  }

  // Transform data for Recharts
  const chartData = data.map((d) => ({
    timestamp: d.timestamp,
    value: parseFloat(d.value),
    formattedTime: formatTime(d.timestamp),
    formattedValue: formatValue(d.value)
  }))

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload
      return (
        <div className="bg-gray-900 border border-gray-600 rounded p-2 shadow-lg">
          <p className="text-gray-300 text-xs">{`${dataPoint.formattedTime}`}</p>
          <p className="text-blue-400 text-sm font-semibold">{`${dataPoint.formattedValue}`}</p>
        </div>
      )
    }
    return null
  }

  const minValue = Math.min(...chartData.map((d) => d.value))
  const maxValue = Math.max(...chartData.map((d) => d.value))

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-2 shadow-lg w-48">
      <div className="text-sm font-semibold text-white mb-2">{getFieldDisplayName(field)}</div>

      <div className="h-24 mb-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.3} />
            <XAxis dataKey="timestamp" axisLine={false} tickLine={false} tick={false} />
            <YAxis domain={['dataMin', 'dataMax']} axisLine={false} tickLine={false} tick={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#colorValue)"
              dot={{ fill: '#3b82f6', strokeWidth: 0, r: 2 }}
              activeDot={{ r: 4, fill: '#3b82f6' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-between text-xs text-gray-300">
        <span>Min: {formatValue(minValue.toString())}</span>
        <span>Max: {formatValue(maxValue.toString())}</span>
      </div>
    </div>
  )
}
