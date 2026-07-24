import type { DB } from '../index'
import type { Tag } from '../types'

interface TagRow {
  id: number
  name: string
}

function mapTag(row: TagRow): Tag {
  return { id: row.id, name: row.name }
}

export function createTagsRepository(db: DB) {
  const listStmt = db.prepare(`SELECT * FROM tags ORDER BY name`)
  const getByNameStmt = db.prepare(`SELECT * FROM tags WHERE name = ?`)
  const insertStmt = db.prepare(`INSERT INTO tags (name) VALUES (?)`)
  const tagNoteStmt = db.prepare(
    `INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (@noteId, @tagId)`
  )
  const untagNoteStmt = db.prepare(
    `DELETE FROM note_tags WHERE note_id = @noteId AND tag_id = @tagId`
  )
  const forNoteStmt = db.prepare(`
    SELECT t.* FROM tags t
    JOIN note_tags nt ON nt.tag_id = t.id
    WHERE nt.note_id = ?
    ORDER BY t.name
  `)

  return {
    list(): Tag[] {
      return (listStmt.all() as TagRow[]).map(mapTag)
    },

    getOrCreate(name: string): Tag {
      const existing = getByNameStmt.get(name) as TagRow | undefined
      if (existing) return mapTag(existing)
      insertStmt.run(name)
      return mapTag(getByNameStmt.get(name) as TagRow)
    },

    tagNote(noteId: number, tagId: number): void {
      tagNoteStmt.run({ noteId, tagId })
    },

    untagNote(noteId: number, tagId: number): void {
      untagNoteStmt.run({ noteId, tagId })
    },

    tagsForNote(noteId: number): Tag[] {
      return (forNoteStmt.all(noteId) as TagRow[]).map(mapTag)
    }
  }
}

export type TagsRepository = ReturnType<typeof createTagsRepository>
