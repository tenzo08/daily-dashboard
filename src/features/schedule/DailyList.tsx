import type { ScheduleOccurrence } from '../../../electron/db/types'

interface DailyListProps {
  date: Date
  occurrences: ScheduleOccurrence[]
  onToggle: (itemId: number, occurrenceDate: string) => void
  onEdit: (itemId: number) => void
  onDelete: (itemId: number) => void
}

export function DailyList({ date, occurrences, onToggle, onEdit, onDelete }: DailyListProps): JSX.Element {
  const sorted = [...occurrences].sort((a, b) => a.occurrenceAt.localeCompare(b.occurrenceAt))

  return (
    <div className="flex-1 overflow-auto p-4">
      <h2 className="mb-3 text-sm font-medium text-graphite-dim">
        {date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
      </h2>
      <ul className="space-y-1">
        {sorted.map((occ) => (
          <li
            key={`${occ.itemId}-${occ.occurrenceAt}`}
            className="flex items-center gap-2 rounded-card border border-line bg-surface px-3 py-2"
          >
            <input
              type="checkbox"
              checked={occ.completed}
              onChange={() => onToggle(occ.itemId, occ.occurrenceDate)}
              className="h-4 w-4 accent-brass"
            />
            <button type="button" onClick={() => onEdit(occ.itemId)} className="flex-1 text-left">
              <span className={`block text-sm ${occ.completed ? 'text-graphite-dim line-through' : 'text-graphite'}`}>
                {occ.title}
              </span>
              <span className="block font-mono text-[11px] tabular-nums text-graphite-dim">
                {occ.allDay
                  ? 'All day'
                  : new Date(occ.occurrenceAt).toLocaleTimeString(undefined, {
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                {occ.reminderMinutesBefore != null && ` · reminder ${occ.reminderMinutesBefore}m before`}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onDelete(occ.itemId)}
              className="text-xs text-graphite-dim hover:text-danger"
            >
              Delete
            </button>
          </li>
        ))}
        {sorted.length === 0 && <li className="text-xs text-graphite-dim">Nothing scheduled</li>}
      </ul>
    </div>
  )
}
