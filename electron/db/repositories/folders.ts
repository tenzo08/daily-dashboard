import type { DB } from '../index'
import type { NoteFolder } from '../types'

interface NoteFolderRow {
  id: number
  name: string
  parent_id: number | null
}

function mapFolder(row: NoteFolderRow): NoteFolder {
  return { id: row.id, name: row.name, parentId: row.parent_id }
}

export function createFoldersRepository(db: DB) {
  const insertStmt = db.prepare(`INSERT INTO note_folders (name, parent_id) VALUES (@name, @parentId)`)
  const listStmt = db.prepare(`SELECT * FROM note_folders ORDER BY name`)
  const getStmt = db.prepare(`SELECT * FROM note_folders WHERE id = ?`)

  return {
    list(): NoteFolder[] {
      return (listStmt.all() as NoteFolderRow[]).map(mapFolder)
    },

    create(name: string, parentId: number | null = null): NoteFolder {
      const result = insertStmt.run({ name, parentId })
      return mapFolder(getStmt.get(result.lastInsertRowid) as NoteFolderRow)
    }
  }
}

export type FoldersRepository = ReturnType<typeof createFoldersRepository>
