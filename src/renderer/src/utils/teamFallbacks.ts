import type { Driver } from '../types/liveTimingTypes'

// The DriverList feed does not always include TeamName/TeamColour for every
// driver. These static maps fill the gaps; the final colour fallback is white.

// 2026 grid — racing number → team name
const DRIVER_TEAM_NAMES: Record<string, string> = {
  // Red Bull Racing
  '1': 'Red Bull Racing',
  '6': 'Red Bull Racing',
  // Racing Bulls
  '30': 'Racing Bulls',
  '41': 'Racing Bulls',
  // Mercedes
  '63': 'Mercedes',
  '12': 'Mercedes',
  // Ferrari
  '16': 'Ferrari',
  '44': 'Ferrari',
  // McLaren
  '4': 'McLaren',
  '81': 'McLaren',
  // Aston Martin
  '14': 'Aston Martin',
  '18': 'Aston Martin',
  // Alpine
  '10': 'Alpine',
  '43': 'Alpine',
  // Williams
  '23': 'Williams',
  '55': 'Williams',
  // Audi
  '5': 'Audi',
  '27': 'Audi',
  // Haas
  '31': 'Haas F1 Team',
  '87': 'Haas F1 Team',
  // Cadillac
  '11': 'Cadillac',
  '77': 'Cadillac'
}

export const FALLBACK_TEAM_COLOUR = 'FFFFFF'

// Team name → colour, hex without '#' (matching the feed's TeamColour format)
const TEAM_COLOURS: Record<string, string> = {
  Mercedes: '27F4D2',
  'Red Bull Racing': '3671C6',
  Ferrari: 'E80020',
  McLaren: 'FF8000',
  'Aston Martin': '229971',
  Alpine: '00A1E8',
  Williams: '1868DB',
  'Racing Bulls': '6692FF',
  'Kick Sauber': '52E252',
  'Haas F1 Team': 'B6BABD',
  Audi: '00E701',
  Cadillac: 'D4AF37'
}

type DriverLike = Partial<Pick<Driver, 'RacingNumber' | 'TeamName' | 'TeamColour'>>

export function getTeamName(driver: DriverLike | undefined): string | undefined {
  if (driver?.TeamName) return driver.TeamName
  if (driver?.RacingNumber) return DRIVER_TEAM_NAMES[driver.RacingNumber]
  return undefined
}

// Hex without '#'; falls back to the team's known colour, then white
export function getTeamColour(driver: DriverLike | undefined): string {
  if (driver?.TeamColour) return driver.TeamColour
  const teamName = getTeamName(driver)
  if (teamName && TEAM_COLOURS[teamName]) return TEAM_COLOURS[teamName]
  return FALLBACK_TEAM_COLOUR
}

// Hex with '#', ready for CSS
export function getTeamColorHex(driver: DriverLike | undefined): string {
  return `#${getTeamColour(driver)}`
}
