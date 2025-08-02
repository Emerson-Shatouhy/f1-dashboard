import { Sector } from '@renderer/types/liveTimingTypes'

interface SectorInfoProps {
  Sectors?: Sector[] | Record<string, Sector>
  isRace?: boolean
}

export function SectorInfo({ Sectors, isRace }: SectorInfoProps): React.JSX.Element {
  // Function for colorizing sectors based on their status
  // console.log('SectorInfo', Sectors)
  const getSectorColor = (sector: Sector | undefined): string => {
    if (!sector) return 'text-gray-500' // Not available
    if (sector.OverallFastest) {
      return 'text-purple-500' // Purple sector
    } else if (sector.PersonalFastest) {
      return 'text-green-500' // Green sector
    } else {
      return 'text-yellow-500' // Yellow sector
    }
  }

  // Function for colorizing segments based on their status
  const getSegmentColor = (status: number): string => {
    switch (status) {
      case 2048:
        return 'bg-yellow-500' // Yellow segment
      case 2049:
        return 'bg-green-500' // Green segment
      case 2050:
        return 'bg-purple-500' // Purple segment
      case 2064:
        return 'bg-blue-500' // Pitlane
      default:
        return 'bg-gray-400' // Default/unknown status
    }
  }

  // Convert sectors to array if it's an object
  const sectorsArray = !Sectors ? [] : Array.isArray(Sectors) ? Sectors : Object.values(Sectors)

  // If no sectors are provided, return empty JSX
  if (!sectorsArray.length) {
    return (
      <div className="text-gray-500">
        <div>-</div>
      </div>
    )
  }

  // Create an array of 3 sectors (0, 1, 2) with undefined for missing sectors
  const allSectors = Array(3)
    .fill(undefined)
    .map((_, index) => sectorsArray[index])

  return (
    <div className="flex flex-row gap-3 text-xl">
      {allSectors.map((sector, index) => (
        <div
          key={index}
          className={`${getSectorColor(sector)} font-mono flex flex-col gap-1 transition-colors duration-500`}
        >
          <div>{sector?.Value || '--.---'}</div>
          {isRace ? (
            <div className="text-gray-500"></div>
          ) : (
            <div className="flex gap-[1px] h-2 w-full">
              {sector?.Segments?.map((segment, segIndex) => (
                <div
                  key={segIndex}
                  className={`flex-1 rounded-sm ${getSegmentColor(segment.Status)} transition-colors duration-300`}
                />
              )) || (
                <div className="flex gap-[1px] h-2 w-full">
                  <div className="flex-1 rounded-sm bg-gray-600" />
                  <div className="flex-1 rounded-sm bg-gray-600" />
                  <div className="flex-1 rounded-sm bg-gray-600" />
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
