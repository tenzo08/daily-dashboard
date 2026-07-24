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
    <section className="flex w-64 shrink-0 flex-col border-r border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line p-3">
        <span className="text-sm font-medium text-graphite">Notes</span>
        <button
          type="button"
          onClick={onCreateNote}
          className="rounded-control bg-brass px-2 py-1 text-xs font-semibold text-graphite hover:bg-brass-bright"
        >
          New
        </button>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 border-b border-line p-2">
          <button
            type="button"
            onClick={() => onSelectTag(undefined)}
            className={`rounded-pill px-2 py-0.5 text-xs ${
              selectedTagId === undefined ? 'bg-brass-tint text-graphite' : 'bg-muted-tint text-muted'
            }`}
          >
            All
          </button>
          {tags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => onSelectTag(tag.id)}
              className={`rounded-pill px-2 py-0.5 text-xs ${
                selectedTagId === tag.id ? 'bg-brass-tint text-graphite' : 'bg-muted-tint text-muted'
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
              className={`block w-full truncate border-b border-line px-3 py-2 text-left text-sm ${
                selectedNoteId === note.id ? 'bg-brass-tint' : 'hover:bg-line/30'
              }`}
            >
              <span className="block truncate font-medium text-graphite">
                {note.isDaily ? `\u{1F4C5} ${note.title}` : note.title}
              </span>
              <span className="block font-mono text-[11px] tabular-nums text-graphite-dim">
                {new Date(note.updatedAt).toLocaleString()}
              </span>
            </button>
          </li>
        ))}
        {notes.length === 0 && <li className="p-3 text-xs text-graphite-dim">No notes yet</li>}
      </ul>
    </section>
  )
}
