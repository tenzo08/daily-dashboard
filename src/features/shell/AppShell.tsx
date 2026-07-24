import { useState } from 'react'
import { api } from '@/lib/api'
import { Icon } from '@/components/ui/Icon'
import { SidebarNavItem } from '@/components/ui/SidebarNavItem'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { DashboardScreen } from '@/features/dashboard/DashboardScreen'
import { NotesScreen } from '@/features/notes/NotesScreen'
import { ScheduleScreen } from '@/features/schedule/ScheduleScreen'
import { BudgetScreen } from '@/features/budget/BudgetScreen'
import { SettingsScreen } from '@/features/settings/SettingsScreen'
import { VaultScreen } from '@/features/vault/VaultScreen'
import { GeneratePasswordScreen } from '@/features/vault/GeneratePasswordScreen'
import { TasksScreen } from '@/features/tasks/TasksScreen'
import { ActivityLogScreen } from '@/features/activity/ActivityLogScreen'

import dashboardIcon from '../../../resources/sidebar/dashboard.svg?raw'
import vaultIcon from '../../../resources/sidebar/vault.svg?raw'
import notesIcon from '../../../resources/sidebar/notes.svg?raw'
import tasksIcon from '../../../resources/sidebar/tasks.svg?raw'
import scheduleIcon from '../../../resources/sidebar/schedule.svg?raw'
import budgetIcon from '../../../resources/sidebar/budget.svg?raw'
import generateIcon from '../../../resources/sidebar/generate-password.svg?raw'
import activityIcon from '../../../resources/sidebar/activity-log.svg?raw'
import settingsIcon from '../../../resources/sidebar/settings.svg?raw'
import lockIcon from '../../../resources/sidebar/lock.svg?raw'

// Simple state-based routing — flat, non-nested screens don't need
// react-router-dom (and its URL/history handling doesn't map cleanly onto
// an Electron file:// renderer anyway). Revisit if a screen needs
// deep-linkable params.
export type Route = 'dashboard' | 'vault' | 'notes' | 'tasks' | 'schedule' | 'budget' | 'generate' | 'activity' | 'settings'

interface AppShellProps {
  onLock: () => void
}

const ICON_SVG: Record<Route, string> = {
  dashboard: dashboardIcon,
  vault: vaultIcon,
  notes: notesIcon,
  tasks: tasksIcon,
  schedule: scheduleIcon,
  budget: budgetIcon,
  generate: generateIcon,
  activity: activityIcon,
  settings: settingsIcon
}

const MODULE_ITEMS: { id: Route; label: string }[] = [
  { id: 'dashboard', label: 'Today' },
  { id: 'vault', label: 'My Vault' },
  { id: 'notes', label: 'Notes' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'budget', label: 'Budget' }
]

const TOOL_ITEMS: { id: Route; label: string }[] = [
  { id: 'generate', label: 'Generate Password' },
  { id: 'activity', label: 'Activity Log' },
  { id: 'settings', label: 'Settings' }
]

export function AppShell({ onLock }: AppShellProps): JSX.Element {
  const [route, setRoute] = useState<Route>('dashboard')

  async function handleLock(): Promise<void> {
    await api.auth.lock()
    onLock()
  }

  return (
    <div className="flex h-screen w-screen bg-paper text-graphite">
      <nav className="flex w-44 shrink-0 flex-col border-r border-line bg-paper p-2.5">
        <div className="mb-2 flex items-center justify-between px-2 pb-1 pt-1">
          <span className="font-mono text-xs font-bold tracking-tight text-graphite">Daily Dashboard</span>
          <ThemeToggle />
        </div>

        <ul className="space-y-0.5">
          {MODULE_ITEMS.map((item) => (
            <li key={item.id}>
              <SidebarNavItem
                icon={<Icon svg={ICON_SVG[item.id]} className="h-4 w-4" />}
                label={item.label}
                active={route === item.id}
                onClick={() => setRoute(item.id)}
              />
            </li>
          ))}
        </ul>

        <div className="mt-auto space-y-2">
          <div>
            <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-graphite-dim">Tools</div>
            <ul className="mt-1 space-y-0.5">
              {TOOL_ITEMS.map((item) => (
                <li key={item.id}>
                  <SidebarNavItem
                    icon={<Icon svg={ICON_SVG[item.id]} className="h-4 w-4" />}
                    label={item.label}
                    active={route === item.id}
                    onClick={() => setRoute(item.id)}
                  />
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            onClick={handleLock}
            className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-left text-sm text-graphite-dim hover:bg-line/50 hover:text-graphite"
          >
            <Icon svg={lockIcon} className="h-4 w-4 shrink-0" />
            Lock
          </button>
          <div className="border-t border-line px-2 pt-2 font-mono text-[9.5px] tracking-wide text-muted">
            [BUILD: 0.1.0]
            <br />
            [DB: LOCAL]
          </div>
        </div>
      </nav>

      <main className="flex flex-1 overflow-auto">
        {/* Dashboard needs cross-navigation (deep-link into a section's
            full view, FR-18); the others are self-contained. */}
        {route === 'dashboard' && <DashboardScreen onNavigate={setRoute} />}
        {route === 'vault' && <VaultScreen />}
        {route === 'notes' && <NotesScreen />}
        {route === 'tasks' && <TasksScreen />}
        {route === 'schedule' && <ScheduleScreen />}
        {route === 'budget' && <BudgetScreen />}
        {route === 'generate' && <GeneratePasswordScreen />}
        {route === 'activity' && <ActivityLogScreen />}
        {route === 'settings' && <SettingsScreen />}
      </main>
    </div>
  )
}
