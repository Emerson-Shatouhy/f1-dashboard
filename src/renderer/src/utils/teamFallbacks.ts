import type { Driver } from '../types/liveTimingTypes'

// The DriverList feed does not always include TeamName/TeamColour for every
// driver. These static maps fill the gaps; the final colour fallback is white.

// 2026 grid — racing number → team name (verified against the live DriverList feed)
const DRIVER_TEAM_NAMES: Record<string, string> = {
  // Red Bull Racing
  '3': 'Red Bull Racing', // Verstappen
  '6': 'Red Bull Racing', // Hadjar
  // Racing Bulls
  '30': 'Racing Bulls', // Lawson
  '41': 'Racing Bulls', // Lindblad
  // Mercedes
  '63': 'Mercedes', // Russell
  '12': 'Mercedes', // Antonelli
  // Ferrari
  '16': 'Ferrari', // Leclerc
  '44': 'Ferrari', // Hamilton
  // McLaren
  '1': 'McLaren', // Norris
  '81': 'McLaren', // Piastri
  // Aston Martin
  '14': 'Aston Martin', // Alonso
  '18': 'Aston Martin', // Stroll
  // Alpine
  '10': 'Alpine', // Gasly
  '43': 'Alpine', // Colapinto
  // Williams
  '23': 'Williams', // Albon
  '55': 'Williams', // Sainz
  // Audi
  '5': 'Audi', // Bortoleto
  '27': 'Audi', // Hulkenberg
  // Haas
  '31': 'Haas F1 Team', // Ocon
  '87': 'Haas F1 Team', // Bearman
  // Cadillac
  '11': 'Cadillac', // Perez
  '77': 'Cadillac' // Bottas
}

export const FALLBACK_TEAM_COLOUR = 'FFFFFF'

// Team name → colour, hex without '#' — the 2026 values the feed sends in TeamColour
const TEAM_COLOURS: Record<string, string> = {
  Mercedes: '00D7B6',
  'Red Bull Racing': '4781D7',
  Ferrari: 'ED1131',
  McLaren: 'F47600',
  'Aston Martin': '229971',
  Alpine: '00A1E8',
  Williams: '1868DB',
  'Racing Bulls': '6C98FF',
  'Haas F1 Team': '9C9FA2',
  Audi: 'F50537',
  Cadillac: '909090'
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
