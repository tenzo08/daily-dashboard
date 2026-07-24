// Default import, not named — rrule ships a webpack UMD bundle that Node's
// native ESM loader (used by tsx for the Phase 1 harness) can't statically
// analyze for named exports. A default import of a CJS module always
// resolves to module.exports, which works identically under Node's loader
// and under Rollup/Vite bundling.
import RRulePackage from 'rrule'
const { RRule } = RRulePackage

// Shared between the schedule repository (main process, reminder loop +
// listOccurrences) and the calendar view (renderer) — see ARCHITECTURE.md
// §4: recurring items are never materialized into rows, only expanded
// on the fly against a date range.

export interface RecurrenceInput {
  startAt: string
  recurrenceRule?: string | null
  recurrenceEndAt?: string | null
}

export function expandOccurrences(item: RecurrenceInput, rangeStart: Date, rangeEnd: Date): Date[] {
  const dtstart = new Date(item.startAt)

  if (!item.recurrenceRule) {
    return dtstart >= rangeStart && dtstart <= rangeEnd ? [dtstart] : []
  }

  const options = RRule.parseString(item.recurrenceRule)
  const rule = new RRule({ ...options, dtstart })

  const effectiveEnd = item.recurrenceEndAt
    ? new Date(Math.min(new Date(item.recurrenceEndAt).getTime(), rangeEnd.getTime()))
    : rangeEnd

  if (effectiveEnd < rangeStart) return []

  return rule.between(rangeStart, effectiveEnd, true)
}

/** Local calendar date key (not UTC) matching schedule_completions.occurrence_date. */
export function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
