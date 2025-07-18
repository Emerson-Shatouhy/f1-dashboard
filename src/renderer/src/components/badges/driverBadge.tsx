import React from 'react'

interface DriverBadgeProps {
  driverNumber: string
  driverCode: string
  teamColor: string // e.g., "00D7B6" (without the #)
  isStopped?: boolean // Optional prop to indicate if the driver is stopped
  inPit?: boolean // Optional prop to indicate if the driver is in the pit
  pitOut?: boolean // Optional prop to indicate if the driver is out of the pit
}

export function DriverBadge({
  driverNumber,
  driverCode,
  teamColor,
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
    <div
      className={`flex items-center gap-2 font-bold text-md ${isStopped ? 'text-gray-500' : 'text-white'}`}
    >
      <div
        className="flex rounded-full overflow-hidden border-2 w-1 h-6"
        style={{
          backgroundColor: bg,
          color: 'black',
          borderColor: bg
        }}
      ></div>
      {driverCode}

      {inPit && <div className="text-xs px-2 py-0.5 rounded-full bg-sky-800">PIT</div>}
      {pitOut && <div className="text-xs px-2 py-0.5 rounded-full bg-teal-800">OUT</div>}
    </div>
  )
}
