import type { DB } from '../db'
import { createFoldersRepository } from '../db/repositories/folders'
import { createNotesRepository } from '../db/repositories/notes'
import { createTagsRepository } from '../db/repositories/tags'
import type { NewNote, NoteFilter } from '../db/types'
import { registerHandler } from './registerHandler'

export function registerNotesHandlers(db: DB): void {
  const folders = createFoldersRepository(db)
  const notes = createNotesRepository(db)
  const tags = createTagsRepository(db)

  registerHandler('notes:listFolders', () => folders.list())
  registerHandler('notes:createFolder', (name: string, parentId?: number | null) =>
    folders.create(name, parentId ?? null)
  )

  registerHandler('notes:listNotes', (filter?: NoteFilter) => notes.listNotes(filter ?? {}))
  registerHandler('notes:getNote', (id: number) => notes.getNote(id))
  registerHandler('notes:createNote', (input: NewNote) => notes.create(input))
  registerHandler(
    'notes:saveNote',
    (id: number, patch: { title?: string; bodyMd?: string; folderId?: number | null }) =>
      notes.saveNote(id, patch)
  )
  registerHandler('notes:getOrCreateDailyNote', () => notes.getOrCreateDailyNote())

  registerHandler('notes:listTags', () => tags.list())
  registerHandler('notes:tagsForNote', (noteId: number) => tags.tagsForNote(noteId))
  registerHandler('notes:addTagToNote', (noteId: number, tagName: string) => {
    const tag = tags.getOrCreate(tagName)
    tags.tagNote(noteId, tag.id)
    return tag
  })
  registerHandler('notes:removeTagFromNote', (noteId: number, tagId: number) => {
    tags.untagNote(noteId, tagId)
  })
}
