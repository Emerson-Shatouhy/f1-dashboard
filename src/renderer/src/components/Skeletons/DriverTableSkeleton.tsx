import React from 'react'

interface DriverTableSkeletonProps {
  rows?: number
}

export function DriverTableSkeleton({ rows = 20 }: DriverTableSkeletonProps): React.JSX.Element {
  return (
    <div className="w-full overflow-hidden border-2 border-gray-700 rounded-lg bg-gray-900 animate-pulse">
      <div className="overflow-x-auto">
        <table className="w-full table-auto">
          <thead className="sticky top-0 z-10">
            <tr className="border-b-2 border-gray-700 bg-gray-800/50">
              <th className="px-2 py-3 text-center">
                <div className="h-4 bg-gray-600 rounded w-8 mx-auto"></div>
              </th>
              <th className="px-2 py-3 text-left">
                <div className="h-4 bg-gray-600 rounded w-24"></div>
              </th>
              <th className="px-2 py-3 text-left hidden sm:table-cell">
                <div className="h-4 bg-gray-600 rounded w-16"></div>
              </th>
              <th className="px-2 py-3 text-left hidden md:table-cell">
                <div className="h-4 bg-gray-600 rounded w-20"></div>
              </th>
              <th className="px-2 py-3 text-left">
                <div className="h-4 bg-gray-600 rounded w-16"></div>
              </th>
              <th className="px-2 py-3 text-center hidden lg:table-cell">
                <div className="h-4 bg-gray-600 rounded w-12 mx-auto"></div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {Array.from({ length: rows }, (_, index) => (
              <tr key={index} className="hover:bg-gray-800/50 transition-colors duration-150">
                <td className="px-2 py-3 text-center">
                  <div className="h-6 bg-gray-700 rounded w-8 mx-auto"></div>
                </td>
                <td className="px-2 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-gray-700 rounded"></div>
                    <div className="flex flex-col gap-1">
                      <div className="h-4 bg-gray-700 rounded w-20"></div>
                      <div className="h-3 bg-gray-700 rounded w-16"></div>
                    </div>
                  </div>
                </td>
                <td className="px-2 py-3 hidden sm:table-cell">
                  <div className="h-4 bg-gray-700 rounded w-16"></div>
                </td>
                <td className="px-2 py-3 hidden md:table-cell">
                  <div className="h-4 bg-gray-700 rounded w-20"></div>
                </td>
                <td className="px-2 py-3">
                  <div className="flex gap-2">
                    <div className="h-6 bg-gray-700 rounded w-16"></div>
                    <div className="h-6 bg-gray-700 rounded w-16"></div>
                    <div className="h-6 bg-gray-700 rounded w-16"></div>
                  </div>
                </td>
                <td className="px-2 py-3 text-center hidden lg:table-cell">
                  <div className="h-6 bg-gray-700 rounded w-12 mx-auto"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}