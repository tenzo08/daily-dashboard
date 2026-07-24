import type { DB } from '../index'
import type { NewScheduleItem, ScheduleItem, ScheduleOccurrence } from '../types'
import { expandOccurrences, toDateKey } from '../../../src/lib/rruleHelpers'

interface ScheduleItemRow {
  id: number
  title: string
  description: string | null
  start_at: string
  end_at: string | null
  all_day: number
  recurrence_rule: string | null
  recurrence_end_at: string | null
  reminder_minutes_before: number | null
  created_at: string
}

interface CompletionRow {
  completed_at: string | null
  skipped: number
}

function mapItem(row: ScheduleItemRow): ScheduleItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    startAt: row.start_at,
    endAt: row.end_at,
    allDay: row.all_day === 1,
    recurrenceRule: row.recurrence_rule,
    recurrenceEndAt: row.recurrence_end_at,
    reminderMinutesBefore: row.reminder_minutes_before,
    createdAt: row.created_at
  }
}

export function createScheduleRepository(db: DB) {
  const insertStmt = db.prepare(`
    INSERT INTO schedule_items
      (title, description, start_at, end_at, all_day, recurrence_rule, recurrence_end_at, reminder_minutes_before)
    VALUES (@title, @description, @startAt, @endAt, @allDay, @recurrenceRule, @recurrenceEndAt, @reminderMinutesBefore)
  `)
  const getStmt = db.prepare(`SELECT * FROM schedule_items WHERE id = ?`)
  const listStmt = db.prepare(`SELECT * FROM schedule_items ORDER BY start_at`)
  const deleteStmt = db.prepare(`DELETE FROM schedule_items WHERE id = ?`)
  const completionStmt = db.prepare(
    `SELECT completed_at, skipped FROM schedule_completions WHERE schedule_item_id = @itemId AND occurrence_date = @date`
  )
  const upsertCompletionStmt = db.prepare(`
    INSERT INTO schedule_completions (schedule_item_id, occurrence_date, completed_at, skipped)
    VALUES (@itemId, @date, @completedAt, 0)
    ON CONFLICT(schedule_item_id, occurrence_date) DO UPDATE SET completed_at = excluded.completed_at
  `)
  const reminderFiredStmt = db.prepare(
    `SELECT 1 FROM reminders_fired WHERE schedule_item_id = @itemId AND occurrence_at = @occurrenceAt`
  )
  const markReminderFiredStmt = db.prepare(
    `INSERT OR IGNORE INTO reminders_fired (schedule_item_id, occurrence_at) VALUES (@itemId, @occurrenceAt)`
  )

  return {
    listItems(): ScheduleItem[] {
      return (listStmt.all() as ScheduleItemRow[]).map(mapItem)
    },

    getItem(id: number): ScheduleItem | undefined {
      const row = getStmt.get(id) as ScheduleItemRow | undefined
      return row ? mapItem(row) : undefined
    },

    createItem(input: NewScheduleItem): ScheduleItem {
      const result = insertStmt.run({
        title: input.title,
        description: input.description ?? null,
        startAt: input.startAt,
        endAt: input.endAt ?? null,
        allDay: input.allDay ? 1 : 0,
        recurrenceRule: input.recurrenceRule ?? null,
        recurrenceEndAt: input.recurrenceEndAt ?? null,
        reminderMinutesBefore: input.reminderMinutesBefore ?? null
      })
      return mapItem(getStmt.get(result.lastInsertRowid) as ScheduleItemRow)
    },

    updateItem(id: number, patch: Partial<NewScheduleItem>): ScheduleItem {
      const current = getStmt.get(id) as ScheduleItemRow
      db.prepare(
        `UPDATE schedule_items SET
           title = @title, description = @description, start_at = @startAt, end_at = @endAt,
           all_day = @allDay, recurrence_rule = @recurrenceRule, recurrence_end_at = @recurrenceEndAt,
           reminder_minutes_before = @reminderMinutesBefore
         WHERE id = @id`
      ).run({
        id,
        title: patch.title ?? current.title,
        description: patch.description !== undefined ? patch.description : current.description,
        startAt: patch.startAt ?? current.start_at,
        endAt: patch.endAt !== undefined ? patch.endAt : current.end_at,
        allDay: patch.allDay !== undefined ? (patch.allDay ? 1 : 0) : current.all_day,
        recurrenceRule: patch.recurrenceRule !== undefined ? patch.recurrenceRule : current.recurrence_rule,
        recurrenceEndAt:
          patch.recurrenceEndAt !== undefined ? patch.recurrenceEndAt : current.recurrence_end_at,
        reminderMinutesBefore:
          patch.reminderMinutesBefore !== undefined
            ? patch.reminderMinutesBefore
            : current.reminder_minutes_before
      })
      return mapItem(getStmt.get(id) as ScheduleItemRow)
    },

    deleteItem(id: number): void {
      deleteStmt.run(id)
    },

    listOccurrences(rangeStartISO: string, rangeEndISO: string): ScheduleOccurrence[] {
      const rangeStart = new Date(rangeStartISO)
      const rangeEnd = new Date(rangeEndISO)
      const items = listStmt.all() as ScheduleItemRow[]

      const occurrences: ScheduleOccurrence[] = []
      for (const row of items) {
        const item = mapItem(row)
        for (const date of expandOccurrences(item, rangeStart, rangeEnd)) {
          const dateKey = toDateKey(date)
          const completion = completionStmt.get({ itemId: item.id, date: dateKey }) as
            | CompletionRow
            | undefined
          occurrences.push({
            itemId: item.id,
            title: item.title,
            description: item.description,
            occurrenceAt: date.toISOString(),
            occurrenceDate: dateKey,
            allDay: item.allDay,
            reminderMinutesBefore: item.reminderMinutesBefore,
            completed: !!completion?.completed_at,
            skipped: completion?.skipped === 1
          })
        }
      }

      return occurrences.sort((a, b) => a.occurrenceAt.localeCompare(b.occurrenceAt))
    },

    /** Returns the occurrence's completed state *after* the toggle. */
    toggleCompletion(itemId: number, occurrenceDate: string): boolean {
      const existing = completionStmt.get({ itemId, date: occurrenceDate }) as CompletionRow | undefined
      const nowCompleted = !existing?.completed_at
      upsertCompletionStmt.run({
        itemId,
        date: occurrenceDate,
        completedAt: nowCompleted ? new Date().toISOString() : null
      })
      return nowCompleted
    },

    isReminderFired(itemId: number, occurrenceAt: string): boolean {
      return !!reminderFiredStmt.get({ itemId, occurrenceAt })
    },

    markReminderFired(itemId: number, occurrenceAt: string): void {
      markReminderFiredStmt.run({ itemId, occurrenceAt })
    }
  }
}

export type ScheduleRepository = ReturnType<typeof createScheduleRepository>
