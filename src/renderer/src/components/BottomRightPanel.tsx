import React from 'react'
import { useBottomRightTabStore, type BottomRightTab } from '@renderer/stores/bottomRightTabStore'
import RaceControlTable from './RaceControlMessages/RaceControlTable'
import OnboardPanel from './Onboard/OnboardPanel'

const TABS: { id: BottomRightTab; label: string }[] = [
  { id: 'race-control', label: 'Race control' },
  { id: 'onboard', label: 'Onboard' }
]

export default function BottomRightPanel(): React.JSX.Element {
  const tab = useBottomRightTabStore((s) => s.tab)
  const choose = useBottomRightTabStore((s) => s.setTab)

  return (
    <div className="flex h-full min-h-0 w-full flex-col rounded-md bg-surface-1">
      <div role="tablist" className="flex shrink-0 gap-3 border-b border-line-strong px-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => choose(t.id)}
            className={`-mb-px border-b-2 py-1.5 text-[11px] font-medium ${
              tab === t.id
                ? 'border-ink text-ink'
                : 'border-transparent text-ink-3 hover:text-ink-2'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'race-control' ? <RaceControlTable embedded /> : <OnboardPanel />}
    </div>
  )
}
