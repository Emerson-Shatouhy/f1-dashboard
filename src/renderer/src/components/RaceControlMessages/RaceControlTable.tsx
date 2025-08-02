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
    <div className="w-full overflow-hidden border-2 border-gray-700 rounded-lg bg-gray-900">
      <div className="overflow-x-auto">
        <table className="w-full table-auto">
          <thead className="sticky top-0 z-10">
            <tr className="border-b-2 border-gray-700 bg-gray-800/50">
              <th className="px-2 py-3 text-left text-xs sm:text-sm lg:text-base font-semibold text-gray-300 uppercase tracking-wider">
                Time
              </th>
              <th className="px-2 py-3 text-left text-xs sm:text-sm lg:text-base font-semibold text-gray-300 uppercase tracking-wider">
                Message
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {Array.from(Messages.entries())
              .reverse()
              .map(([key, message]) => (
                <tr
                  key={key}
                  className="hover:bg-gray-700 transition-colors duration-200 ease-in-out"
                >
                  <td className="px-2 py-3 whitespace-nowrap text-xs sm:text-sm lg:text-base font-semibold text-gray-300">
                    {new Date(message.Utc).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </td>
                  <td className="px-2 py-3 text-xs sm:text-sm lg:text-base font-semibold text-gray-300">
                    {message.Message}
                  </td>
                  {message.Category === 'Flag' ? (
                    <td className="px-2 py-3">
                      <Flag
                        className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6"
                        color={getFlagColor(message.Flag)}
                      />
                    </td>
                  ) : (
                    <td className="px-2 py-3"></td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {Messages.size === 0 && (
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="text-xs sm:text-sm lg:text-base font-semibold text-gray-300 uppercase tracking-wider">
            No race control messages yet
          </div>
        </div>
      )}
    </div>
  )
}
