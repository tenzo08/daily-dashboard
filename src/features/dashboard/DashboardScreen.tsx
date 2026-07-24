import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { StatusPill, type StatusPillTone } from '@/components/ui/StatusPill'
import type { Route } from '@/features/shell/AppShell'
import type { DashboardSnapshot } from '../../../electron/ipc/contract'
import type { TaskPriority } from '../../../electron/db/types'

interface DashboardScreenProps {
  onNavigate: (route: Route) => void
}

const NOTE_PREVIEW_LIMIT = 300
const PRIORITY_TONE: Record<TaskPriority, StatusPillTone> = { high: 'danger', medium: 'warning', low: 'muted' }

function StatTile({ label, value, onClick }: { label: string; value: string; onClick: () => void }): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-card border border-line bg-surface p-3.5 text-left hover:border-brass/50"
    >
      <div className="mb-1.5 text-[11px] text-graphite-dim">{label}</div>
      <div className="font-mono text-xl font-semibold tabular-nums text-graphite">{value}</div>
    </button>
  )
}

export function DashboardScreen({ onNavigate }: DashboardScreenProps): JSX.Element {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null)

  const refresh = useCallback(async () => {
    setSnapshot(await api.dashboard.getToday())
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function handleToggle(itemId: number, occurrenceDate: string): Promise<void> {
    await api.schedule.toggleCompletion(itemId, occurrenceDate)
    refresh()
  }

  if (!snapshot) {
    return <div className="p-6 font-mono text-sm text-graphite-dim">[SYSTEM_STATUS: LOADING]</div>
  }

  const notePreview =
    snapshot.note.bodyMd.length > NOTE_PREVIEW_LIMIT
      ? `${snapshot.note.bodyMd.slice(0, NOTE_PREVIEW_LIMIT)}…`
      : snapshot.note.bodyMd

  return (
    <div className="flex-1 overflow-auto p-6">
      <h1 className="mb-4 text-lg font-semibold text-graphite">Today</h1>

      <div className="mb-5 grid grid-cols-4 gap-3">
        <StatTile label="Credentials" value={String(snapshot.counts.credentials)} onClick={() => onNavigate('vault')} />
        <StatTile label="Notes" value={String(snapshot.counts.notes)} onClick={() => onNavigate('notes')} />
        <StatTile label="Open tasks" value={String(snapshot.counts.openTasks)} onClick={() => onNavigate('tasks')} />
        <StatTile
          label="This month's income"
          value={snapshot.budgetSnapshot.monthIncome.toLocaleString(undefined, { style: 'currency', currency: 'PHP' })}
          onClick={() => onNavigate('budget')}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card title="Upcoming tasks" action={<button type="button" onClick={() => onNavigate('tasks')} className="text-xs text-graphite-dim hover:text-brass">View all</button>}>
          <ul className="space-y-2">
            {snapshot.tasks.map((task) => (
              <li key={task.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-graphite">{task.title}</span>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-mono text-[11px] tabular-nums text-graphite-dim">{task.dueDate ?? ''}</span>
                  <StatusPill tone={PRIORITY_TONE[task.priority]}>{task.priority}</StatusPill>
                </div>
              </li>
            ))}
            {snapshot.tasks.length === 0 && <li className="text-xs text-graphite-dim">No open tasks</li>}
          </ul>

          <div className="mt-4 border-t border-line pt-3">
            <div className="mb-1.5 flex items-center justify-between">
              <h3 className="text-xs font-medium text-graphite-dim">Today&apos;s schedule</h3>
              <button type="button" onClick={() => onNavigate('schedule')} className="text-xs text-graphite-dim hover:text-brass">
                Open →
              </button>
            </div>
            <ul className="space-y-1.5">
              {snapshot.schedule.map((occ) => (
                <li key={`${occ.itemId}-${occ.occurrenceAt}`} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={occ.completed}
                    onChange={() => handleToggle(occ.itemId, occ.occurrenceDate)}
                    className="h-3.5 w-3.5 accent-brass"
                  />
                  <span className={occ.completed ? 'text-graphite-dim line-through' : 'text-graphite'}>{occ.title}</span>
                </li>
              ))}
              {snapshot.schedule.length === 0 && <li className="text-xs text-graphite-dim">Nothing scheduled today</li>}
            </ul>
          </div>
        </Card>

        <Card title="Recent activity" action={<button type="button" onClick={() => onNavigate('activity')} className="text-xs text-graphite-dim hover:text-brass">View all</button>}>
          <ul className="space-y-2">
            {snapshot.activity.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-graphite">{entry.message}</span>
                <span className="shrink-0 font-mono text-[11px] tabular-nums text-graphite-dim">
                  {new Date(entry.createdAt.includes('T') ? entry.createdAt : `${entry.createdAt.replace(' ', 'T')}Z`).toLocaleTimeString(
                    undefined,
                    { hour: '2-digit', minute: '2-digit' }
                  )}
                </span>
              </li>
            ))}
            {snapshot.activity.length === 0 && <li className="text-xs text-graphite-dim">No activity yet</li>}
          </ul>

          <div className="mt-4 border-t border-line pt-3">
            <h3 className="mb-1.5 text-xs font-medium text-graphite-dim">Today&apos;s note</h3>
            <p className="whitespace-pre-wrap text-xs text-graphite-dim">{notePreview || 'No notes yet today.'}</p>
          </div>
        </Card>
      </div>
    </div>
  )
}
