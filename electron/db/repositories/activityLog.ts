import type { DB } from '../index'
import type { ActivityEntry } from '../types'

interface ActivityRow {
  id: number
  event_type: string
  message: string
  created_at: string
}

function mapEntry(row: ActivityRow): ActivityEntry {
  return { id: row.id, eventType: row.event_type, message: row.message, createdAt: row.created_at }
}

export function createActivityLogRepository(db: DB) {
  const insertStmt = db.prepare(`INSERT INTO activity_log (event_type, message) VALUES (@eventType, @message)`)
  const listStmt = db.prepare(`SELECT * FROM activity_log ORDER BY created_at DESC, id DESC LIMIT ?`)
  const lastForTypeStmt = db.prepare(`
    SELECT * FROM activity_log WHERE event_type = ? ORDER BY created_at DESC, id DESC LIMIT 1
  `)

  return {
    log(eventType: string, message: string): void {
      insertStmt.run({ eventType, message })
    },

    list(limit = 50): ActivityEntry[] {
      return (listStmt.all(limit) as ActivityRow[]).map(mapEntry)
    },

    /** Used to throttle noisy event types (e.g. note autosave) to one log line per window. */
    lastForType(eventType: string): ActivityEntry | undefined {
      const row = lastForTypeStmt.get(eventType) as ActivityRow | undefined
      return row ? mapEntry(row) : undefined
    }
  }
}

export type ActivityLogRepository = ReturnType<typeof createActivityLogRepository>
