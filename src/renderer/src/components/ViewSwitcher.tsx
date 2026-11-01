import React from 'react'
import { Table2, Tv } from 'lucide-react'
import { useNavigationStore, type DashboardView } from '@renderer/stores/navigationStore'

const VIEWS: { id: DashboardView; label: string; icon: React.ReactNode }[] = [
  { id: 'pitwall', label: 'Pit wall', icon: <Table2 className="h-3.5 w-3.5" /> },
  { id: 'broadcast', label: 'Broadcast', icon: <Tv className="h-3.5 w-3.5" /> }
]

export function ViewSwitcher(): React.JSX.Element {
  const view = useNavigationStore((state) => state.view)
  const setView = useNavigationStore((state) => state.setView)

  return (
    <div
      className="flex shrink-0 rounded-md bg-surface-2 p-0.5"
      role="group"
      aria-label="Dashboard view"
    >
      {VIEWS.map(({ id, label, icon }) => (
        <button
          key={id}
          onClick={() => setView(id)}
          aria-pressed={view === id}
          className={`flex cursor-pointer items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors ${
            view === id ? 'bg-surface-3 text-ink' : 'text-ink-2 hover:text-ink'
          }`}
        >
          {icon}
          {label}
        </button>
      ))}
    </div>
  )
}
