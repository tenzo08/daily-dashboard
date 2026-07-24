import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import type { Tag } from '../../../electron/db/types'

interface NoteEditorProps {
  noteId: number
  onSaved: () => void
  onTagsChanged: () => void
}

type SaveState = 'idle' | 'saving' | 'saved'

// Plain Markdown + a small insert-syntax toolbar, not a WYSIWYG editor —
// FR-7 asks for bold/italic/lists/checkboxes, which Markdown syntax covers
// without pulling in an editor dependency (Tiptap/Milkdown) this app
// doesn't otherwise need. Revisit if richer formatting is requested.
export function NoteEditor({ noteId, onSaved, onTagsChanged }: NoteEditorProps): JSX.Element {
  const [title, setTitle] = useState('')
  const [bodyMd, setBodyMd] = useState('')
  const [noteTags, setNoteTags] = useState<Tag[]>([])
  const [newTagName, setNewTagName] = useState('')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [loaded, setLoaded] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const skipNextSave = useRef(true)

  useEffect(() => {
    let cancelled = false
    setLoaded(false)
    skipNextSave.current = true
    Promise.all([api.notes.getNote(noteId), api.notes.tagsForNote(noteId)]).then(([note, fetchedTags]) => {
      if (cancelled || !note) return
      setTitle(note.title)
      setBodyMd(note.bodyMd)
      setNoteTags(fetchedTags)
      setLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [noteId])

  // Debounced autosave. Skips the run that fires immediately after load
  // (title/bodyMd changing from '' to the loaded values isn't an edit).
  useEffect(() => {
    if (!loaded) return
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }
    setSaveState('saving')
    const timeout = setTimeout(async () => {
      await api.notes.saveNote(noteId, { title, bodyMd })
      setSaveState('saved')
      onSaved()
    }, 500)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, bodyMd, loaded])

  function insertAtCursor(before: string, after = ''): void {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = bodyMd.slice(start, end)
    const next = bodyMd.slice(0, start) + before + selected + after + bodyMd.slice(end)
    setBodyMd(next)
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.selectionStart = start + before.length
      textarea.selectionEnd = start + before.length + selected.length
    })
  }

  async function handleAddTag(): Promise<void> {
    const name = newTagName.trim()
    if (!name) return
    const tag = await api.notes.addTagToNote(noteId, name)
    setNoteTags((prev) => (prev.some((t) => t.id === tag.id) ? prev : [...prev, tag]))
    setNewTagName('')
    onTagsChanged()
  }

  async function handleRemoveTag(tagId: number): Promise<void> {
    await api.notes.removeTagFromNote(noteId, tagId)
    setNoteTags((prev) => prev.filter((t) => t.id !== tagId))
    onTagsChanged()
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-neutral-200 p-3">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="flex-1 border-none text-lg font-semibold outline-none"
          placeholder="Untitled"
        />
        <span className="text-xs text-neutral-400">
          {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : ''}
        </span>
      </div>

      <div className="flex gap-1 border-b border-neutral-200 p-2">
        <button
          type="button"
          onClick={() => insertAtCursor('**', '**')}
          className="rounded px-2 py-1 text-xs font-bold hover:bg-neutral-100"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => insertAtCursor('_', '_')}
          className="rounded px-2 py-1 text-xs italic hover:bg-neutral-100"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => insertAtCursor('- ')}
          className="rounded px-2 py-1 text-xs hover:bg-neutral-100"
        >
          List
        </button>
        <button
          type="button"
          onClick={() => insertAtCursor('- [ ] ')}
          className="rounded px-2 py-1 text-xs hover:bg-neutral-100"
        >
          Checkbox
        </button>
      </div>

      <textarea
        ref={textareaRef}
        value={bodyMd}
        onChange={(event) => setBodyMd(event.target.value)}
        className="flex-1 resize-none p-4 font-mono text-sm outline-none"
        placeholder="Start writing…"
      />

      <div className="flex flex-wrap items-center gap-1 border-t border-neutral-200 p-2">
        {noteTags.map((tag) => (
          <span
            key={tag.id}
            className="flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600"
          >
            #{tag.name}
            <button
              type="button"
              onClick={() => handleRemoveTag(tag.id)}
              className="text-neutral-400 hover:text-neutral-700"
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={newTagName}
          onChange={(event) => setNewTagName(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && handleAddTag()}
          placeholder="+ tag"
          className="w-20 rounded border border-neutral-300 px-2 py-0.5 text-xs"
        />
      </div>
    </div>
  )
}
