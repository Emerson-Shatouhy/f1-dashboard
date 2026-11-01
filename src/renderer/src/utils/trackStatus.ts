export interface TrackStatusConfig {
  label: string
  shortLabel: string
  color: string // CSS colour value, usable in inline styles and SVG
  pulse: string // Tailwind animation class; urgent statuses pulse faster
  clear: boolean
}

const NEUTRAL: TrackStatusConfig = {
  label: 'No status',
  shortLabel: 'No status',
  color: 'var(--color-flag-none)',
  pulse: '',
  clear: false
}

/**
 * Status codes:
 * 1 - AllClear
 * 2 - Yellow
 * 3 - Unknown
 * 4 - SCDeployed
 * 5 - Red
 * 6 - VSCDeployed
 * 7 - VSCEnding
 **/
export function getTrackStatusConfig(status: string | undefined): TrackStatusConfig {
  switch (status) {
    case '1':
      return {
        label: 'Track clear',
        shortLabel: 'Clear',
        color: 'var(--color-flag-clear)',
        pulse: '',
        clear: true
      }
    case '2':
      return {
        label: 'Yellow flag',
        shortLabel: 'Yellow',
        color: 'var(--color-flag-yellow)',
        pulse: 'animate-[pulse_1s_ease-in-out_infinite]',
        clear: false
      }
    case '4':
      return {
        label: 'Safety car',
        shortLabel: 'Safety car',
        color: 'var(--color-flag-sc)',
        pulse: 'animate-[pulse_1s_ease-in-out_infinite]',
        clear: false
      }
    case '5':
      return {
        label: 'Red flag',
        shortLabel: 'Red flag',
        color: 'var(--color-flag-red)',
        pulse: 'animate-[pulse_0.75s_ease-in-out_infinite]',
        clear: false
      }
    case '6':
      return {
        label: 'Virtual safety car',
        shortLabel: 'VSC',
        color: 'var(--color-flag-vsc)',
        pulse: 'animate-[pulse_1s_ease-in-out_infinite]',
        clear: false
      }
    case '7':
      return {
        label: 'VSC ending',
        shortLabel: 'VSC ending',
        color: 'var(--color-flag-vsc)',
        pulse: 'animate-[pulse_1s_ease-in-out_infinite]',
        clear: false
      }
    default:
      return NEUTRAL
  }
}
