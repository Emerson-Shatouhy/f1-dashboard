import React from 'react'

interface DriverBadgeProps {
  driverNumber: string
  driverCode: string
  teamColor: string // e.g., "00D7B6" (without the #)
  teamName?: string // Optional team name to display under driver code
  isStopped?: boolean // Optional prop to indicate if the driver is stopped
  inPit?: boolean // Optional prop to indicate if the driver is in the pit
  pitOut?: boolean // Optional prop to indicate if the driver is out of the pit
}

export function DriverBadge({
  driverNumber,
  driverCode,
  teamColor,
  teamName,
  isStopped = false, // Optional prop to indicate if the driver is stopped
  inPit = false,
  pitOut = false // Optional prop to indicate if the driver is out of the pit
}: DriverBadgeProps): React.JSX.Element {
  // If the driver code is empty, return notih
  if (!driverCode || driverCode.trim() === '') {
    return <></>
  }
  // If the number is single digit, pad it with a leading zero
  if (driverNumber.length === 1) {
    driverNumber = `0${driverNumber}`
  }

  // If the team color is empty, use a default color
  if (!teamColor || teamColor.trim() === '') {
    teamColor = 'FFFFFF' // Default color is white
  }

  const bg = `#${teamColor}`

  return (
    <div className={`flex items-center gap-2 ${isStopped ? 'text-gray-500' : 'text-white'}`}>
      <div
        className="flex rounded-full overflow-hidden border-2 w-1.5 h-10 sm:w-2 sm:h-12 lg:w-2.5 lg:h-14 xl:w-2 xl:h-16"
        style={{
          backgroundColor: bg,
          color: 'black',
          borderColor: bg
        }}
      ></div>
      <div className="flex flex-col gap-1">
        <div className="font-bold text-base sm:text-lg lg:text-xl xl:text-xl">{driverCode}</div>
        {teamName && (
          <div className="text-xs sm:text-sm lg:text-base text-gray-400 font-medium">
            {teamName}
          </div>
        )}
      </div>

      {inPit && (
        <div
          className="text-xs px-2 py-0.5 rounded-full text-black font-bold"
          style={{ backgroundColor: bg }}
        >
          PIT
        </div>
      )}
      {pitOut && (
        <div
          className="text-xs px-2 py-0.5 rounded-full text-black font-bold"
          style={{ backgroundColor: bg }}
        >
          OUT
        </div>
      )}
    </div>
  )
}
