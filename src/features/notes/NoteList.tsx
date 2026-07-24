import type { NoteSummary, Tag } from '../../../electron/db/types'

interface NoteListProps {
  notes: NoteSummary[]
  tags: Tag[]
  selectedTagId: number | undefined
  onSelectTag: (id: number | undefined) => void
  selectedNoteId: number | null
  onSelectNote: (id: number) => void
  onCreateNote: () => void
}

export function NoteList({
  notes,
  tags,
  selectedTagId,
  onSelectTag,
  selectedNoteId,
  onSelectNote,
  onCreateNote
}: NoteListProps): JSX.Element {
  return (
    <section className="flex w-64 shrink-0 flex-col border-r border-neutral-200 bg-white">
      <div className="flex items-center justify-between border-b border-neutral-200 p-3">
        <span className="text-sm font-medium">Notes</span>
        <button
          type="button"
          onClick={onCreateNote}
          className="rounded bg-neutral-900 px-2 py-1 text-xs text-white"
        >
          New
        </button>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 border-b border-neutral-200 p-2">
          <button
            type="button"
            onClick={() => onSelectTag(undefined)}
            className={`rounded-full px-2 py-0.5 text-xs ${
              selectedTagId === undefined ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600'
            }`}
          >
            All
          </button>
          {tags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => onSelectTag(tag.id)}
              className={`rounded-full px-2 py-0.5 text-xs ${
                selectedTagId === tag.id ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600'
              }`}
            >
              #{tag.name}
            </button>
          ))}
        </div>
      )}

      <ul className="flex-1 overflow-auto">
        {notes.map((note) => (
          <li key={note.id}>
            <button
              type="button"
              onClick={() => onSelectNote(note.id)}
              className={`block w-full truncate border-b border-neutral-100 px-3 py-2 text-left text-sm ${
                selectedNoteId === note.id ? 'bg-neutral-100' : 'hover:bg-neutral-50'
              }`}
            >
              <span className="block truncate font-medium">
                {note.isDaily ? `\u{1F4C5} ${note.title}` : note.title}
              </span>
              <span className="block text-xs text-neutral-400">
                {new Date(note.updatedAt).toLocaleString()}
              </span>
            </button>
          </li>
        ))}
        {notes.length === 0 && <li className="p-3 text-xs text-neutral-400">No notes yet</li>}
      </ul>
    </section>
  )
}
