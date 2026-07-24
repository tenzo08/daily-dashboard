import { Notification, type BrowserWindow } from 'electron'
import type { DB } from '../db'
import { createScheduleRepository } from '../db/repositories/schedule'
import type { ScheduleOccurrence } from '../db/types'

const POLL_INTERVAL_MS = 30_000
const LOOKAHEAD_MS = 24 * 60 * 60 * 1000

/**
 * Polls for schedule occurrences whose reminder threshold has passed but
 * the event itself hasn't happened yet, and fires a native Windows toast
 * for each — deduped via reminders_fired so a restart doesn't re-fire.
 * Runs entirely in the main process; doesn't depend on any window being
 * open (ARCHITECTURE.md §5.2) — that's what makes tray persistence
 * (Phase 4) actually pay off.
 */
export function startReminderLoop(db: DB, getWindow: () => BrowserWindow | null): () => void {
  const schedule = createScheduleRepository(db)

  function tick(): void {
    const now = Date.now()
    const rangeStart = new Date(now)
    const rangeEnd = new Date(now + LOOKAHEAD_MS)
    // Querying from `now` already excludes occurrences that have passed —
    // no separate staleness check needed, an event that already happened
    // never appears in this result set.
    const occurrences = schedule.listOccurrences(rangeStart.toISOString(), rangeEnd.toISOString())

    for (const occ of occurrences) {
      if (occ.reminderMinutesBefore == null) continue
      const occurrenceTime = new Date(occ.occurrenceAt).getTime()
      const reminderTime = occurrenceTime - occ.reminderMinutesBefore * 60_000
      if (reminderTime > now) continue
      if (schedule.isReminderFired(occ.itemId, occ.occurrenceAt)) continue

      fireReminder(occ, getWindow)
      schedule.markReminderFired(occ.itemId, occ.occurrenceAt)
    }
  }

  tick()
  const interval = setInterval(tick, POLL_INTERVAL_MS)
  return () => clearInterval(interval)
}

function fireReminder(occ: ScheduleOccurrence, getWindow: () => BrowserWindow | null): void {
  if (!Notification.isSupported()) {
    console.warn('[reminder] Notifications not supported on this platform')
    return
  }

  const body = occ.allDay
    ? 'All day'
    : new Date(occ.occurrenceAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

  const notification = new Notification({ title: occ.title, body })
  notification.on('click', () => {
    const window = getWindow()
    if (window) {
      window.show()
      window.focus()
    }
  })
  notification.show()
  console.log(`[reminder] fired: "${occ.title}" at ${occ.occurrenceAt}`)
}
