import { Stint } from '@renderer/types/liveTimingTypes'
import React, { JSX } from 'react'
import HardTire from '@renderer/assets/Tires/Hard.svg'
import MediumTire from '@renderer/assets/Tires/Medium.svg'
import SoftTire from '@renderer/assets/Tires/Soft.svg'
import InterTire from '@renderer/assets/Tires/Inter.svg'
import WetTire from '@renderer/assets/Tires/Wet.svg'
import UnknownTire from '@renderer/assets/Tires/Unknown.svg'

interface TireBadgeProps {
  stint: Stint | undefined
}

export function TireBadge({ stint }: TireBadgeProps): React.JSX.Element {
  if (!stint || !stint.Compound) {
    return <img src={UnknownTire} alt="Unknown tire" className="w-10 h-10" />
  }

  const tireAge = stint.TotalLaps - stint.StartLaps + 1
  const tireAgeText = `${tireAge} lap${tireAge !== 1 ? 's' : ''}`

  const getTireImage = (): JSX.Element => {
    switch (stint.Compound) {
      case 'HARD':
        return <img src={HardTire} alt="Hard tire" className="w-10 h-10" />
      case 'MEDIUM':
        return <img src={MediumTire} alt="Medium tire" className="w-10 h-10" />
      case 'SOFT':
        return <img src={SoftTire} alt="Soft tire" className="w-10 h-10" />
      case 'INTERMEDIATE':
        return <img src={InterTire} alt="Intermediate tire" className="w-10 h-10" />
      case 'WET':
        return <img src={WetTire} alt="Wet tire" className="w-10 h-10" />
      default:
        return <img src={UnknownTire} alt="Unknown tire" className="w-10 h-10" />
    }
  }

  return (
    <div className="relative group">
      {getTireImage()}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
        {tireAgeText}
      </div>
    </div>
  )
}
