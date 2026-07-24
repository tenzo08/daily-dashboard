import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { Route } from '@/features/shell/AppShell'
import type { DashboardSnapshot } from '../../../electron/ipc/contract'

interface DashboardScreenProps {
  onNavigate: (route: Route) => void
}

const NOTE_PREVIEW_LIMIT = 300

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
    return <div className="p-6 text-sm text-neutral-400">Loading…</div>
  }

  const totalBalance = snapshot.budgetSnapshot.accountBalances.reduce((sum, b) => sum + b.balance, 0)
  const topCategories = [...snapshot.budgetSnapshot.monthSpendByCategory]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
  const notePreview =
    snapshot.note.bodyMd.length > NOTE_PREVIEW_LIMIT
      ? `${snapshot.note.bodyMd.slice(0, NOTE_PREVIEW_LIMIT)}…`
      : snapshot.note.bodyMd

  return (
    <div className="grid h-full grid-cols-3 gap-4 overflow-auto p-4">
      <section className="rounded border border-neutral-200 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium text-neutral-500">Today&apos;s note</h2>
          <button
            type="button"
            onClick={() => onNavigate('notes')}
            className="text-xs text-neutral-400 hover:underline"
          >
            Open →
          </button>
        </div>
        <h3 className="mb-1 text-sm font-semibold">{snapshot.note.title}</h3>
        <p className="whitespace-pre-wrap text-xs text-neutral-500">
          {notePreview || 'No notes yet today.'}
        </p>
      </section>

      <section className="rounded border border-neutral-200 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium text-neutral-500">Today&apos;s schedule</h2>
          <button
            type="button"
            onClick={() => onNavigate('schedule')}
            className="text-xs text-neutral-400 hover:underline"
          >
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
                className="h-3.5 w-3.5"
              />
              <span className={occ.completed ? 'text-neutral-400 line-through' : ''}>{occ.title}</span>
            </li>
          ))}
          {snapshot.schedule.length === 0 && (
            <li className="text-xs text-neutral-400">Nothing scheduled today</li>
          )}
        </ul>
      </section>

      <section className="rounded border border-neutral-200 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium text-neutral-500">Budget snapshot</h2>
          <button
            type="button"
            onClick={() => onNavigate('budget')}
            className="text-xs text-neutral-400 hover:underline"
          >
            Open →
          </button>
        </div>
        <div className="mb-3 text-lg font-semibold">{totalBalance.toLocaleString()}</div>
        <ul className="space-y-1">
          {topCategories.map((category) => (
            <li key={category.categoryId} className="flex justify-between text-xs text-neutral-500">
              <span>{category.categoryName}</span>
              <span>{category.amount.toLocaleString()}</span>
            </li>
          ))}
          {topCategories.length === 0 && (
            <li className="text-xs text-neutral-400">No spending this month yet</li>
          )}
        </ul>
      </section>
    </div>
  )
}
