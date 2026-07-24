import type { DB } from '../db'
import { createActivityLogRepository } from '../db/repositories/activityLog'
import { createFoldersRepository } from '../db/repositories/folders'
import { createNotesRepository } from '../db/repositories/notes'
import { createTagsRepository } from '../db/repositories/tags'
import type { NewNote, NoteFilter } from '../db/types'
import { registerHandler } from './registerHandler'

// Autosave fires ~500ms after every keystroke (NoteEditor.tsx) — logging
// every save would flood the activity feed, so edits to the same note are
// only logged once per window.
const NOTE_EDIT_LOG_THROTTLE_MS = 10 * 60_000

export function registerNotesHandlers(db: DB): void {
  const folders = createFoldersRepository(db)
  const notes = createNotesRepository(db)
  const tags = createTagsRepository(db)
  const activity = createActivityLogRepository(db)

  registerHandler('notes:listFolders', () => folders.list())
  registerHandler('notes:createFolder', (name: string, parentId?: number | null) =>
    folders.create(name, parentId ?? null)
  )

  registerHandler('notes:listNotes', (filter?: NoteFilter) => notes.listNotes(filter ?? {}))
  registerHandler('notes:getNote', (id: number) => notes.getNote(id))
  registerHandler('notes:createNote', (input: NewNote) => {
    const note = notes.create(input)
    activity.log('note.created', `Created note — ${note.title}`)
    return note
  })
  registerHandler(
    'notes:saveNote',
    (id: number, patch: { title?: string; bodyMd?: string; folderId?: number | null }) => {
      const note = notes.saveNote(id, patch)
      const eventType = `note.edited.${id}`
      const last = activity.lastForType(eventType)
      const throttled = last && Date.now() - new Date(last.createdAt).getTime() < NOTE_EDIT_LOG_THROTTLE_MS
      if (!throttled) activity.log(eventType, `Edited note — ${note.title}`)
      return note
    }
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
