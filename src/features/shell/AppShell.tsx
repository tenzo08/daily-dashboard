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
export type Route = 'dashboard' | 'notes' | 'schedule' | 'budget' | 'settings'

const NAV_ITEMS: { id: Route; label: string }[] = [
  { id: 'dashboard', label: 'Today' },
  { id: 'notes', label: 'Notes' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'budget', label: 'Budget' },
  { id: 'settings', label: 'Settings' }
]

export function AppShell(): JSX.Element {
  const [route, setRoute] = useState<Route>('dashboard')

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
        {/* Dashboard needs cross-navigation (deep-link into a section's
            full view, FR-18); the others are self-contained. */}
        {route === 'dashboard' && <DashboardScreen onNavigate={setRoute} />}
        {route === 'notes' && <NotesScreen />}
        {route === 'schedule' && <ScheduleScreen />}
        {route === 'budget' && <BudgetScreen />}
        {route === 'settings' && <SettingsScreen />}
      </main>
    </div>
  )
}
