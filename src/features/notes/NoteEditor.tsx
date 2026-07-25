import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import type { Task, Tag } from '../../../electron/db/types'

interface NoteEditorProps {
  noteId: number
  onSaved: () => void
  onTagsChanged: () => void
  onDeleted: () => void
  /** Set by AppShell — jumps to Tasks and opens the given task for editing. */
  onOpenTask: (taskId: number) => void
}

type SaveState = 'idle' | 'saving' | 'saved'

// Plain Markdown + a small insert-syntax toolbar, not a WYSIWYG editor —
// FR-7 asks for bold/italic/lists/checkboxes, which Markdown syntax covers
// without pulling in an editor dependency (Tiptap/Milkdown) this app
// doesn't otherwise need. Revisit if richer formatting is requested.
export function NoteEditor({ noteId, onSaved, onTagsChanged, onDeleted, onOpenTask }: NoteEditorProps): JSX.Element {
  const [title, setTitle] = useState('')
  const [bodyMd, setBodyMd] = useState('')
  const [noteTags, setNoteTags] = useState<Tag[]>([])
  const [newTagName, setNewTagName] = useState('')
  const [linkedTasks, setLinkedTasks] = useState<Task[]>([])
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [loaded, setLoaded] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const skipNextSave = useRef(true)

  const refreshLinkedTasks = useCallback(async () => {
    setLinkedTasks(await api.tasks.list({ linkedNoteId: noteId }))
  }, [noteId])

  useEffect(() => {
    refreshLinkedTasks()
  }, [refreshLinkedTasks])

  async function handleAddLinkedTask(): Promise<void> {
    await api.tasks.create({ title: title.trim() || 'Untitled', linkedNoteId: noteId })
    refreshLinkedTasks()
  }

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

  async function handleDelete(): Promise<void> {
    await api.notes.delete(noteId)
    onDeleted()
  }

  return (
    <div className="flex flex-1 flex-col bg-surface">
      <div className="flex items-center gap-2 border-b border-line p-3">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="flex-1 border-none bg-transparent text-lg font-semibold text-graphite outline-none"
          placeholder="Untitled"
        />
        <span className="font-mono text-[11px] uppercase tracking-wider text-graphite-dim">
          {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : ''}
        </span>
        <button
          type="button"
          onClick={handleDelete}
          className="rounded-control px-2 py-1 text-xs text-graphite-dim hover:text-danger"
        >
          Delete
        </button>
      </div>

      <div className="flex gap-1 border-b border-line p-2">
        <button
          type="button"
          onClick={() => insertAtCursor('**', '**')}
          className="rounded-control px-2 py-1 text-xs font-bold text-graphite-dim hover:bg-line/40"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => insertAtCursor('_', '_')}
          className="rounded-control px-2 py-1 text-xs italic text-graphite-dim hover:bg-line/40"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => insertAtCursor('- ')}
          className="rounded-control px-2 py-1 text-xs text-graphite-dim hover:bg-line/40"
        >
          List
        </button>
        <button
          type="button"
          onClick={() => insertAtCursor('- [ ] ')}
          className="rounded-control px-2 py-1 text-xs text-graphite-dim hover:bg-line/40"
        >
          Checkbox
        </button>
      </div>

      <textarea
        ref={textareaRef}
        value={bodyMd}
        onChange={(event) => setBodyMd(event.target.value)}
        className="flex-1 resize-none bg-surface p-4 text-sm text-graphite outline-none"
        placeholder="Start writing…"
      />

      {linkedTasks.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-line p-2">
          <span className="text-[11px] uppercase tracking-wider text-graphite-dim">Tasks</span>
          {linkedTasks.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => onOpenTask(task.id)}
              className={`truncate rounded-pill px-2 py-0.5 text-[11px] ${
                task.status === 'done' ? 'bg-success-tint text-success line-through' : 'bg-muted-tint text-muted'
              }`}
            >
              {task.title}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1 border-t border-line p-2">
        <button
          type="button"
          onClick={handleAddLinkedTask}
          className="rounded-control px-2 py-0.5 text-xs text-graphite-dim hover:bg-line/40"
        >
          + Task
        </button>
        {noteTags.map((tag) => (
          <span
            key={tag.id}
            className="flex items-center gap-1 rounded-pill bg-muted-tint px-2 py-0.5 text-xs text-muted"
          >
            #{tag.name}
            <button
              type="button"
              onClick={() => handleRemoveTag(tag.id)}
              className="text-muted hover:text-graphite"
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
          className="w-20 rounded-control border border-line bg-paper px-2 py-0.5 text-xs text-graphite focus:border-brass focus:outline-none"
        />
      </div>
    </div>
  )
}
