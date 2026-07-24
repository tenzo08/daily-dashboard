// rrule resolves differently depending on who's importing it, and no
// single static import style satisfies both:
//  - Renderer (Vite/esbuild) resolves rrule's "module" field — a real ESM
//    build with named exports (RRule, ...) and no default.
//  - Main process at runtime and the tsx harness (Node's native ESM
//    loader) resolve the "main" field — a webpack UMD/CJS bundle. Node's
//    cjs-module-lexer can't statically detect named exports from that
//    wrapper, so only `.default` (== the whole module.exports) reliably
//    exists there.
// A namespace import plus a runtime fallback works in both: try the named
// export first (Vite), fall back to .default (Node/CJS).
import * as RRuleNamespace from 'rrule'
type RRuleModule = typeof RRuleNamespace
// Accessed through a dynamic key (not a literal `.default`) so Rollup's
// static ESM-interop analysis doesn't flag this as importing a default
// that the real ESM build doesn't have — it's a runtime-only fallback for
// the CJS/UMD build, where it does.
const defaultKey = 'default' as const
const rruleModule =
  (RRuleNamespace as unknown as Record<typeof defaultKey, RRuleModule | undefined>)[defaultKey] ??
  RRuleNamespace
const { RRule } = rruleModule

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
