import { useState, type FormEvent } from 'react'
import { api } from '@/lib/api'
import { toDateKey } from '@/lib/rruleHelpers'
import type { NewScheduleItem, ScheduleItem } from '../../../electron/db/types'

interface ScheduleItemFormProps {
  itemId: number | null
  initial: ScheduleItem | null
  defaultDate: Date
  onSaved: () => void
  onCancel: () => void
  onDelete: () => void
}

type RepeatFreq = 'none' | 'DAILY' | 'WEEKLY' | 'MONTHLY'
type EndType = 'never' | 'onDate' | 'afterCount'

const WEEKDAYS: { value: string; label: string }[] = [
  { value: 'SU', label: 'S' },
  { value: 'MO', label: 'M' },
  { value: 'TU', label: 'T' },
  { value: 'WE', label: 'W' },
  { value: 'TH', label: 'T' },
  { value: 'FR', label: 'F' },
  { value: 'SA', label: 'S' }
]

function parseRRule(rule: string): {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  interval: number
  byDay: string[]
  count?: number
} {
  const parts = Object.fromEntries(rule.split(';').map((p) => p.split('=') as [string, string]))
  return {
    freq: (parts['FREQ'] as 'DAILY' | 'WEEKLY' | 'MONTHLY') ?? 'DAILY',
    interval: parts['INTERVAL'] ? Number(parts['INTERVAL']) : 1,
    byDay: parts['BYDAY'] ? parts['BYDAY'].split(',') : [],
    count: parts['COUNT'] ? Number(parts['COUNT']) : undefined
  }
}

function buildRRule(freq: string, interval: number, byDay: string[], count: number | undefined): string {
  const parts = [`FREQ=${freq}`, `INTERVAL=${interval}`]
  if (byDay.length > 0) parts.push(`BYDAY=${byDay.join(',')}`)
  if (count) parts.push(`COUNT=${count}`)
  return parts.join(';')
}

function combineDateTime(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const [h, min] = timeStr.split(':').map(Number)
  return new Date(y, m - 1, d, h, min).toISOString()
}

export function ScheduleItemForm({
  itemId,
  initial,
  defaultDate,
  onSaved,
  onCancel,
  onDelete
}: ScheduleItemFormProps): JSX.Element {
  const initialStart = initial ? new Date(initial.startAt) : defaultDate
  const parsedRule = initial?.recurrenceRule ? parseRRule(initial.recurrenceRule) : null

  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [startDate, setStartDate] = useState(toDateKey(initialStart))
  const [startTime, setStartTime] = useState(
    `${String(initialStart.getHours()).padStart(2, '0')}:${String(initialStart.getMinutes()).padStart(2, '0')}`
  )
  const [allDay, setAllDay] = useState(initial?.allDay ?? false)
  const [repeatFreq, setRepeatFreq] = useState<RepeatFreq>(parsedRule?.freq ?? 'none')
  const [interval, setInterval] = useState(parsedRule?.interval ?? 1)
  const [byDay, setByDay] = useState<Set<string>>(new Set(parsedRule?.byDay ?? []))
  const [endType, setEndType] = useState<EndType>(
    initial?.recurrenceEndAt ? 'onDate' : parsedRule?.count ? 'afterCount' : 'never'
  )
  const [endDate, setEndDate] = useState(
    initial?.recurrenceEndAt ? toDateKey(new Date(initial.recurrenceEndAt)) : ''
  )
  const [endCount, setEndCount] = useState(parsedRule?.count ?? 5)
  const [reminderMinutes, setReminderMinutes] = useState(
    initial?.reminderMinutesBefore != null ? String(initial.reminderMinutesBefore) : ''
  )
  const [saving, setSaving] = useState(false)

  function toggleByDay(day: string): void {
    setByDay((prev) => {
      const next = new Set(prev)
      if (next.has(day)) next.delete(day)
      else next.add(day)
      return next
    })
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!title.trim()) return
    setSaving(true)

    const startAt = combineDateTime(startDate, allDay ? '00:00' : startTime)
    const recurrenceRule =
      repeatFreq === 'none'
        ? undefined
        : buildRRule(
            repeatFreq,
            interval,
            repeatFreq === 'WEEKLY' ? Array.from(byDay) : [],
            endType === 'afterCount' ? endCount : undefined
          )
    const recurrenceEndAt =
      endType === 'onDate' && endDate ? new Date(`${endDate}T23:59:59`).toISOString() : undefined

    const input: NewScheduleItem = {
      title: title.trim(),
      description: description.trim() || undefined,
      startAt,
      allDay,
      recurrenceRule,
      recurrenceEndAt,
      reminderMinutesBefore: reminderMinutes.trim() ? Number(reminderMinutes) : undefined
    }

    if (itemId) {
      await api.schedule.updateItem(itemId, input)
    } else {
      await api.schedule.createItem(input)
    }
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-void/40">
      <form
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-96 overflow-auto rounded-panel border border-line bg-surface p-4"
      >
        <h2 className="mb-3 text-sm font-semibold text-graphite">{itemId ? 'Edit item' : 'New item'}</h2>

        <label className="mb-2 block text-xs text-graphite-dim">
          Title
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            autoFocus
            className="mt-0.5 w-full rounded-control border border-line bg-paper px-2 py-1 text-sm text-graphite focus:border-brass focus:outline-none"
          />
        </label>

        <label className="mb-2 block text-xs text-graphite-dim">
          Description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="mt-0.5 w-full rounded-control border border-line bg-paper px-2 py-1 text-sm text-graphite focus:border-brass focus:outline-none"
            rows={2}
          />
        </label>

        <div className="mb-2 flex items-end gap-2">
          <label className="flex-1 text-xs text-graphite-dim">
            Date
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="mt-0.5 w-full rounded-control border border-line bg-paper px-2 py-1 text-sm text-graphite focus:border-brass focus:outline-none"
            />
          </label>
          {!allDay && (
            <label className="flex-1 text-xs text-graphite-dim">
              Time
              <input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className="mt-0.5 w-full rounded-control border border-line bg-paper px-2 py-1 text-sm text-graphite focus:border-brass focus:outline-none"
              />
            </label>
          )}
          <label className="flex items-center gap-1 pb-1 text-xs text-graphite-dim">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(event) => setAllDay(event.target.checked)}
              className="accent-brass"
            />
            All day
          </label>
        </div>

        <label className="mb-2 block text-xs text-graphite-dim">
          Repeat
          <select
            value={repeatFreq}
            onChange={(event) => setRepeatFreq(event.target.value as RepeatFreq)}
            className="mt-0.5 w-full rounded-control border border-line bg-paper px-2 py-1 text-sm text-graphite focus:border-brass focus:outline-none"
          >
            <option value="none">Does not repeat</option>
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
          </select>
        </label>

        {repeatFreq !== 'none' && (
          <div className="mb-2 rounded-control border border-line p-2">
            <label className="mb-2 block text-xs text-graphite-dim">
              Every
              <input
                type="number"
                min={1}
                value={interval}
                onChange={(event) => setInterval(Math.max(1, Number(event.target.value)))}
                className="ml-2 w-16 rounded-control border border-line bg-paper px-2 py-0.5 text-sm text-graphite focus:border-brass focus:outline-none"
              />{' '}
              {repeatFreq === 'DAILY' ? 'day(s)' : repeatFreq === 'WEEKLY' ? 'week(s)' : 'month(s)'}
            </label>

            {repeatFreq === 'WEEKLY' && (
              <div className="mb-2 flex gap-1">
                {WEEKDAYS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleByDay(day.value)}
                    className={`h-6 w-6 rounded-pill text-xs ${
                      byDay.has(day.value) ? 'bg-brass text-graphite' : 'bg-muted-tint text-muted'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            )}

            <label className="mb-1 block text-xs text-graphite-dim">
              Ends
              <select
                value={endType}
                onChange={(event) => setEndType(event.target.value as EndType)}
                className="ml-2 rounded-control border border-line bg-paper px-2 py-0.5 text-sm text-graphite focus:border-brass focus:outline-none"
              >
                <option value="never">Never</option>
                <option value="onDate">On date</option>
                <option value="afterCount">After N times</option>
              </select>
            </label>
            {endType === 'onDate' && (
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="w-full rounded-control border border-line bg-paper px-2 py-1 text-sm text-graphite focus:border-brass focus:outline-none"
              />
            )}
            {endType === 'afterCount' && (
              <input
                type="number"
                min={1}
                value={endCount}
                onChange={(event) => setEndCount(Math.max(1, Number(event.target.value)))}
                className="w-20 rounded-control border border-line bg-paper px-2 py-1 text-sm text-graphite focus:border-brass focus:outline-none"
              />
            )}
          </div>
        )}

        <label className="mb-3 block text-xs text-graphite-dim">
          Remind me (minutes before, blank = no reminder)
          <input
            type="number"
            min={0}
            value={reminderMinutes}
            onChange={(event) => setReminderMinutes(event.target.value)}
            className="mt-0.5 w-full rounded-control border border-line bg-paper px-2 py-1 text-sm text-graphite focus:border-brass focus:outline-none"
          />
        </label>

        <div className="flex items-center justify-between">
          <div>
            {itemId && (
              <button type="button" onClick={onDelete} className="text-xs text-danger hover:underline">
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-control px-3 py-1.5 text-sm text-graphite-dim hover:bg-line/40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="rounded-control bg-brass px-3 py-1.5 text-sm font-semibold text-graphite hover:bg-brass-bright disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
