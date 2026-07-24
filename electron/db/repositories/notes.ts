import type { DB } from '../index'
import type { NewNote, Note, NoteFilter, NoteSummary } from '../types'

interface NoteRow {
  id: number
  folder_id: number | null
  title: string
  body_md: string
  is_daily: number
  note_date: string | null
  created_at: string
  updated_at: string
}

function mapNote(row: NoteRow): Note {
  return {
    id: row.id,
    folderId: row.folder_id,
    title: row.title,
    bodyMd: row.body_md,
    isDaily: row.is_daily === 1,
    noteDate: row.note_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function mapSummary(row: NoteRow): NoteSummary {
  return {
    id: row.id,
    folderId: row.folder_id,
    title: row.title,
    isDaily: row.is_daily === 1,
    noteDate: row.note_date,
    updatedAt: row.updated_at
  }
}

/** Local calendar date (not UTC) — "today" means the user's local day. */
function todayDateString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function createNotesRepository(db: DB) {
  const insertStmt = db.prepare(`
    INSERT INTO notes (folder_id, title, body_md, is_daily, note_date)
    VALUES (@folderId, @title, @bodyMd, @isDaily, @noteDate)
  `)
  const getStmt = db.prepare(`SELECT * FROM notes WHERE id = ?`)
  const getByDateStmt = db.prepare(`SELECT * FROM notes WHERE is_daily = 1 AND note_date = ?`)
  const updateStmt = db.prepare(`
    UPDATE notes SET folder_id = @folderId, title = @title, body_md = @bodyMd, updated_at = datetime('now')
    WHERE id = @id
  `)

  return {
    listNotes(filter: NoteFilter = {}): NoteSummary[] {
      if (filter.tagId !== undefined) {
        const rows = db
          .prepare(
            `SELECT n.* FROM notes n
             JOIN note_tags nt ON nt.note_id = n.id
             WHERE nt.tag_id = @tagId
             ${filter.folderId !== undefined ? 'AND n.folder_id = @folderId' : ''}
             ORDER BY n.updated_at DESC`
          )
          .all({ tagId: filter.tagId, folderId: filter.folderId }) as NoteRow[]
        return rows.map(mapSummary)
      }

      if (filter.folderId !== undefined) {
        const rows = db
          .prepare(`SELECT * FROM notes WHERE folder_id = @folderId ORDER BY updated_at DESC`)
          .all({ folderId: filter.folderId }) as NoteRow[]
        return rows.map(mapSummary)
      }

      const rows = db.prepare(`SELECT * FROM notes ORDER BY updated_at DESC`).all() as NoteRow[]
      return rows.map(mapSummary)
    },

    getNote(id: number): Note | undefined {
      const row = getStmt.get(id) as NoteRow | undefined
      return row ? mapNote(row) : undefined
    },

    create(input: NewNote): Note {
      const result = insertStmt.run({
        folderId: input.folderId ?? null,
        title: input.title,
        bodyMd: input.bodyMd ?? '',
        isDaily: 0,
        noteDate: null
      })
      return mapNote(getStmt.get(result.lastInsertRowid) as NoteRow)
    },

    saveNote(id: number, patch: { title?: string; bodyMd?: string; folderId?: number | null }): Note {
      const current = getStmt.get(id) as NoteRow
      updateStmt.run({
        id,
        folderId: patch.folderId !== undefined ? patch.folderId : current.folder_id,
        title: patch.title ?? current.title,
        bodyMd: patch.bodyMd ?? current.body_md
      })
      return mapNote(getStmt.get(id) as NoteRow)
    },

    getOrCreateDailyNote(): Note {
      const today = todayDateString()
      const existing = getByDateStmt.get(today) as NoteRow | undefined
      if (existing) return mapNote(existing)

      const result = insertStmt.run({
        folderId: null,
        title: today,
        bodyMd: '',
        isDaily: 1,
        noteDate: today
      })
      return mapNote(getStmt.get(result.lastInsertRowid) as NoteRow)
    }
  }
}

export type NotesRepository = ReturnType<typeof createNotesRepository>
