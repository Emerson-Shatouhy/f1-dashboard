import type { SessionMode } from '../../utils/timing'

export type ColumnKey =
  | 'pos'
  | 'driver'
  | 'tyre'
  | 'interval'
  | 'gap'
  | 'delta'
  | 'best'
  | 'last'
  | 's1'
  | 's2'
  | 's3'
  | 'pits'
  | 'laps'

export interface TimingColumn {
  key: ColumnKey
  label: string
  weight: number // relative width; the table is table-fixed so values never shift columns
  align?: 'left' | 'right' | 'center'
  minTableWidth?: number // hidden when the table is narrower than this
}

const SECTORS_MIN_WIDTH = 720

const sectorColumns: TimingColumn[] = [
  { key: 's1', label: 'S1', weight: 7, align: 'right', minTableWidth: SECTORS_MIN_WIDTH },
  { key: 's2', label: 'S2', weight: 7, align: 'right', minTableWidth: SECTORS_MIN_WIDTH },
  { key: 's3', label: 'S3', weight: 7, align: 'right', minTableWidth: SECTORS_MIN_WIDTH }
]

const COLUMNS: Record<SessionMode, TimingColumn[]> = {
  race: [
    { key: 'pos', label: 'P', weight: 4, align: 'center' },
    { key: 'driver', label: 'Driver', weight: 15 },
    { key: 'tyre', label: 'Tyre', weight: 8 },
    { key: 'interval', label: 'Int', weight: 10, align: 'right' },
    { key: 'gap', label: 'Gap', weight: 10, align: 'right', minTableWidth: 480 },
    { key: 'last', label: 'Last', weight: 11, align: 'right' },
    { key: 'best', label: 'Best', weight: 11, align: 'right', minTableWidth: 600 },
    ...sectorColumns,
    { key: 'pits', label: 'Pit', weight: 5, align: 'right', minTableWidth: 660 }
  ],
  quali: [
    { key: 'pos', label: 'P', weight: 4, align: 'center' },
    { key: 'driver', label: 'Driver', weight: 15 },
    { key: 'tyre', label: 'Tyre', weight: 8 },
    { key: 'best', label: 'Best', weight: 11, align: 'right' },
    { key: 'gap', label: 'Gap', weight: 9, align: 'right', minTableWidth: 480 },
    { key: 'delta', label: 'Live', weight: 13, align: 'right' },
    { key: 'last', label: 'Last', weight: 11, align: 'right', minTableWidth: 600 },
    ...sectorColumns
  ],
  practice: [
    { key: 'pos', label: 'P', weight: 4, align: 'center' },
    { key: 'driver', label: 'Driver', weight: 15 },
    { key: 'tyre', label: 'Tyre', weight: 8 },
    { key: 'best', label: 'Best', weight: 11, align: 'right' },
    { key: 'gap', label: 'Gap', weight: 10, align: 'right' },
    { key: 'interval', label: 'Int', weight: 10, align: 'right', minTableWidth: 540 },
    { key: 'last', label: 'Last', weight: 11, align: 'right', minTableWidth: 480 },
    ...sectorColumns,
    { key: 'laps', label: 'Laps', weight: 5, align: 'right', minTableWidth: 660 }
  ]
}

export function getTimingColumns(mode: SessionMode, tableWidth: number): TimingColumn[] {
  return COLUMNS[mode].filter((c) => !c.minTableWidth || tableWidth >= c.minTableWidth)
}

export const ALIGN_CLASS = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center'
} as const
