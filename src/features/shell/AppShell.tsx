import { useState } from 'react'
import { DashboardScreen } from '@/features/dashboard/DashboardScreen'
import { NotesScreen } from '@/features/notes/NotesScreen'
import { ScheduleScreen } from '@/features/schedule/ScheduleScreen'
import { BudgetScreen } from '@/features/budget/BudgetScreen'
import { SettingsScreen } from '@/features/settings/SettingsScreen'

// Simple state-based routing — five flat, non-nested screens don't need
// react-router-dom (and its URL/history handling doesn't map cleanly onto
// an Electron file:// renderer anyway). Revisit if a screen needs
// deep-linkable params.
type Route = 'dashboard' | 'notes' | 'schedule' | 'budget' | 'settings'

const NAV_ITEMS: { id: Route; label: string }[] = [
  { id: 'dashboard', label: 'Today' },
  { id: 'notes', label: 'Notes' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'budget', label: 'Budget' },
  { id: 'settings', label: 'Settings' }
]

const SCREENS: Record<Route, () => JSX.Element> = {
  dashboard: DashboardScreen,
  notes: NotesScreen,
  schedule: ScheduleScreen,
  budget: BudgetScreen,
  settings: SettingsScreen
}

export function AppShell(): JSX.Element {
  const [route, setRoute] = useState<Route>('dashboard')
  const Screen = SCREENS[route]

  return (
    <div className="flex h-screen w-screen bg-neutral-50 text-neutral-900">
      <nav className="w-44 shrink-0 border-r border-neutral-200 bg-white p-3">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setRoute(item.id)}
                className={`w-full rounded px-3 py-2 text-left text-sm ${
                  route === item.id ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-100'
                }`}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <main className="flex-1 overflow-auto">
        <Screen />
      </main>
    </div>
  )
}
