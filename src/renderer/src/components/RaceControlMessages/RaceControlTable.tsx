import React from 'react'
import { useRaceControlMessagesStore } from '@renderer/stores/raceControlMessagesStore'
import { Flag } from 'lucide-react'

export default function RaceControlTable(): React.JSX.Element {
  const { Messages } = useRaceControlMessagesStore()

  // Function for getting flag color based on category and flag
  function getFlagColor(category?: string): string {
    switch (category) {
      case 'YELLOW':
        return '#FFD700' // Hex code for yellow
      case 'RED':
        return '#FF0000' // Hex code for red
      case 'GREEN':
        return '#008000' // Hex code for green
      case 'BLUE':
        return '#0000FF' // Hex code for blue
      case 'CLEAR':
        return '#008000' // Hex code for white
      case 'BLACK':
        return '#000000' // Hex code for black
      case 'CHECKERED':
        return '#808080' // Hex code for gray
      default:
        return '#A9A9A9' // Hex code for default gray
    }
  }

  return (
    <div className="overflow-hidden h-full rounded-lg shadow-xl w-full">
      {' '}
      {/* Added shadow and rounded corners */}
      <table className="w-full text-sm text-left text-gray-200">
        {' '}
        {/* Brighter text for better contrast */}
        <thead className="text-xs uppercase bg-gray-900 text-gray-400 sticky top-0 border-b border-gray-700">
          {' '}
          {/* Darker header, subtle border */}
          <tr>
            <th scope="col" className="py-3 px-6 font-semibold tracking-wider">
              {' '}
              {/* Stronger font weight, letter spacing */}
              Time
            </th>
            <th scope="col" className="py-3 px-6 font-semibold tracking-wider">
              Message
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {' '}
          {/* Added row dividers */}
          {Array.from(Messages.entries())
            .reverse()
            .map(([key, message]) => (
              <tr
                key={key}
                className="bg-gray-800 hover:bg-gray-700 transition-colors duration-200 ease-in-out"
              >
                {' '}
                {/* Hover effect for rows */}
                <td className="py-3 px-6 whitespace-nowrap text-gray-300">
                  {' '}
                  {/* Slightly lighter text for time */}
                  {new Date(message.Utc).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </td>
                <td className="py-3 px-6 text-gray-200">{message.Message}</td>{' '}
                {/* Consistent text color for message */}
                {message.Category === 'Flag' ? (
                  <td className={`py-3 px-6 ${getFlagColor(message.Flag)}`}>
                    <Flag color={getFlagColor(message.Flag)} />
                  </td>
                ) : (
                  <td className="py-3 px-6 text-gray-500"></td>
                )}
              </tr>
            ))}
        </tbody>
      </table>
      {Messages.size === 0 && (
        <div className="flex items-center justify-center h-full bg-gray-800 text-gray-500 py-10">
          No race control messages yet.
        </div>
      )}
    </div>
  )
}
