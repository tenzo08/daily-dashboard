import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { toDateKey } from '@/lib/rruleHelpers'
import type { ScheduleItem, ScheduleOccurrence } from '../../../electron/db/types'
import { CalendarView, buildGrid } from './CalendarView'
import { DailyList } from './DailyList'
import { ScheduleItemForm } from './ScheduleItemForm'

type ViewMode = 'list' | 'calendar'
type FormState = { mode: 'closed' } | { mode: 'create'; date: Date } | { mode: 'edit'; itemId: number }

export function ScheduleScreen(): JSX.Element {
  const [view, setView] = useState<ViewMode>('list')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [occurrences, setOccurrences] = useState<ScheduleOccurrence[]>([])
  const [formState, setFormState] = useState<FormState>({ mode: 'closed' })
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null)

  const grid = buildGrid(selectedDate)
  const rangeStart = grid[0]
  const rangeEnd = grid[grid.length - 1]

  const refreshOccurrences = useCallback(async () => {
    setOccurrences(await api.schedule.listOccurrences(rangeStart.toISOString(), rangeEnd.toISOString()))
  }, [rangeStart, rangeEnd])

  useEffect(() => {
    refreshOccurrences()
  }, [refreshOccurrences])

  useEffect(() => {
    if (formState.mode === 'edit') {
      api.schedule.getItem(formState.itemId).then((item) => setEditingItem(item ?? null))
    } else {
      setEditingItem(null)
    }
  }, [formState])

  async function handleToggle(itemId: number, occurrenceDate: string): Promise<void> {
    await api.schedule.toggleCompletion(itemId, occurrenceDate)
    refreshOccurrences()
  }

  async function handleDelete(itemId: number): Promise<void> {
    await api.schedule.deleteItem(itemId)
    setFormState({ mode: 'closed' })
    refreshOccurrences()
  }

  function goToMonth(offset: number): void {
    setSelectedDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1))
  }

  const selectedKey = toDateKey(selectedDate)
  const dayOccurrences = occurrences.filter((occ) => occ.occurrenceDate === selectedKey)

  return (
    <div className="flex h-full flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-line p-3">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setView('list')}
            className={`rounded-control px-3 py-1 text-sm ${
              view === 'list' ? 'bg-brass-tint font-medium text-graphite' : 'text-graphite-dim hover:bg-line/40'
            }`}
          >
            List
          </button>
          <button
            type="button"
            onClick={() => setView('calendar')}
            className={`rounded-control px-3 py-1 text-sm ${
              view === 'calendar' ? 'bg-brass-tint font-medium text-graphite' : 'text-graphite-dim hover:bg-line/40'
            }`}
          >
            Calendar
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedDate(new Date())}
            className="rounded-control px-3 py-1 text-sm text-graphite-dim hover:bg-line/40"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setFormState({ mode: 'create', date: selectedDate })}
            className="rounded-control bg-brass px-3 py-1 text-sm font-semibold text-graphite hover:bg-brass-bright"
          >
            New
          </button>
        </div>
      </div>

      {view === 'list' ? (
        <DailyList
          date={selectedDate}
          occurrences={dayOccurrences}
          onToggle={handleToggle}
          onEdit={(itemId) => setFormState({ mode: 'edit', itemId })}
          onDelete={handleDelete}
        />
      ) : (
        <CalendarView
          month={selectedDate}
          occurrences={occurrences}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onPrevMonth={() => goToMonth(-1)}
          onNextMonth={() => goToMonth(1)}
        />
      )}

      {/* Gate on editingItem being loaded before mounting: ScheduleItemForm
          seeds its fields from `initial` only in useState's initializer, so
          mounting before the async fetch resolves would freeze it blank. */}
      {(formState.mode === 'create' || (formState.mode === 'edit' && editingItem)) && (
        <ScheduleItemForm
          key={formState.mode === 'edit' ? formState.itemId : 'create'}
          itemId={formState.mode === 'edit' ? formState.itemId : null}
          initial={formState.mode === 'edit' ? editingItem : null}
          defaultDate={formState.mode === 'create' ? formState.date : selectedDate}
          onSaved={() => {
            setFormState({ mode: 'closed' })
            refreshOccurrences()
          }}
          onCancel={() => setFormState({ mode: 'closed' })}
          onDelete={() => {
            if (formState.mode === 'edit') handleDelete(formState.itemId)
          }}
        />
      )}
    </div>
  )
}
