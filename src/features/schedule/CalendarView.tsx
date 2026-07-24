import { toDateKey } from '@/lib/rruleHelpers'
import type { ScheduleOccurrence } from '../../../electron/db/types'

interface CalendarViewProps {
  month: Date
  occurrences: ScheduleOccurrence[]
  selectedDate: Date
  onSelectDate: (date: Date) => void
  onPrevMonth: () => void
  onNextMonth: () => void
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

// 6 weeks always covers a month regardless of layout (Sunday-start grid).
// Exported so ScheduleScreen can fetch exactly the range this grid renders.
export function buildGrid(month: Date): Date[] {
  const first = startOfMonth(month)
  const gridStart = addDays(first, -first.getDay())
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function CalendarView({
  month,
  occurrences,
  selectedDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth
}: CalendarViewProps): JSX.Element {
  const grid = buildGrid(month)
  const occurrencesByDate = new Map<string, ScheduleOccurrence[]>()
  for (const occ of occurrences) {
    const list = occurrencesByDate.get(occ.occurrenceDate) ?? []
    list.push(occ)
    occurrencesByDate.set(occ.occurrenceDate, list)
  }

  const monthLabel = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const selectedKey = toDateKey(selectedDate)
  const currentMonthIndex = month.getMonth()

  return (
    <div className="flex flex-1 flex-col p-4">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={onPrevMonth} className="rounded px-2 py-1 text-sm hover:bg-neutral-100">
          ‹
        </button>
        <span className="text-sm font-medium">{monthLabel}</span>
        <button type="button" onClick={onNextMonth} className="rounded px-2 py-1 text-sm hover:bg-neutral-100">
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded border border-neutral-200 bg-neutral-200 text-xs">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="bg-neutral-50 px-2 py-1 text-center font-medium text-neutral-500">
            {label}
          </div>
        ))}
        {grid.map((date) => {
          const key = toDateKey(date)
          const dayOccurrences = occurrencesByDate.get(key) ?? []
          const isCurrentMonth = date.getMonth() === currentMonthIndex
          const isSelected = key === selectedKey
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(date)}
              className={`min-h-16 bg-white p-1 text-left align-top ${
                isSelected ? 'ring-2 ring-inset ring-neutral-900' : ''
              } ${isCurrentMonth ? '' : 'text-neutral-300'}`}
            >
              <span className="text-xs">{date.getDate()}</span>
              <div className="mt-0.5 space-y-0.5">
                {dayOccurrences.slice(0, 3).map((occ) => (
                  <div
                    key={`${occ.itemId}-${occ.occurrenceAt}`}
                    className={`truncate rounded bg-neutral-100 px-1 text-[10px] ${
                      occ.completed ? 'text-neutral-400 line-through' : 'text-neutral-700'
                    }`}
                  >
                    {occ.title}
                  </div>
                ))}
                {dayOccurrences.length > 3 && (
                  <div className="text-[10px] text-neutral-400">+{dayOccurrences.length - 3} more</div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
