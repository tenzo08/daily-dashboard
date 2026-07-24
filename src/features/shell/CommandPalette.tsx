import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import type { Route } from '@/features/shell/AppShell'
import type { CredentialSummary, NoteSummary, Task } from '../../../electron/db/types'

interface CommandPaletteProps {
  onNavigate: (route: Route) => void
  onSelectNote: (id: number) => void
  onSelectTask: (id: number) => void
  onSelectCredential: (id: number) => void
}

const RESULT_LIMIT = 6

// Global Ctrl+K quick-open across notes, tasks, and vault entries. Vault
// results only ever show title/username (CredentialSummary) — never the
// decrypted secret, which stays behind the existing reveal-on-demand flow.
export function CommandPalette({
  onNavigate,
  onSelectNote,
  onSelectTask,
  onSelectCredential
}: CommandPaletteProps): JSX.Element | null {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [notes, setNotes] = useState<NoteSummary[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [credentials, setCredentials] = useState<CredentialSummary[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((value) => !value)
      } else if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (!open) return
    setQuery('')
    Promise.all([api.notes.listNotes({}), api.tasks.list(), api.credentials.list()]).then(
      ([noteResults, taskResults, credentialResults]) => {
        setNotes(noteResults)
        setTasks(taskResults)
        setCredentials(credentialResults)
      }
    )
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [open])

  if (!open) return null

  function close(): void {
    setOpen(false)
  }

  const q = query.trim().toLowerCase()
  const noteMatches = q ? notes.filter((n) => n.title.toLowerCase().includes(q)).slice(0, RESULT_LIMIT) : []
  const taskMatches = q ? tasks.filter((t) => t.title.toLowerCase().includes(q)).slice(0, RESULT_LIMIT) : []
  const credentialMatches = q
    ? credentials
        .filter((c) => c.title.toLowerCase().includes(q) || (c.username ?? '').toLowerCase().includes(q))
        .slice(0, RESULT_LIMIT)
    : []
  const hasResults = noteMatches.length + taskMatches.length + credentialMatches.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-void/40 pt-32" onClick={close}>
      <div
        className="w-full max-w-lg rounded-panel border border-line bg-surface shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search notes, tasks, vault…"
          className="w-full border-b border-line bg-transparent px-4 py-3 text-sm text-graphite outline-none"
        />

        <div className="max-h-80 overflow-auto p-2">
          {!q && (
            <p className="p-3 text-xs text-graphite-dim">Type to search across notes, tasks, and vault entries.</p>
          )}
          {q && !hasResults && <p className="p-3 text-xs text-graphite-dim">No matches.</p>}

          {noteMatches.length > 0 && (
            <div className="mb-2">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-graphite-dim">
                Notes
              </div>
              {noteMatches.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => {
                    onNavigate('notes')
                    onSelectNote(note.id)
                    close()
                  }}
                  className="block w-full truncate rounded-control px-2 py-1.5 text-left text-sm text-graphite hover:bg-line/40"
                >
                  {note.title}
                </button>
              ))}
            </div>
          )}

          {taskMatches.length > 0 && (
            <div className="mb-2">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-graphite-dim">
                Tasks
              </div>
              {taskMatches.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => {
                    onNavigate('tasks')
                    onSelectTask(task.id)
                    close()
                  }}
                  className="block w-full truncate rounded-control px-2 py-1.5 text-left text-sm text-graphite hover:bg-line/40"
                >
                  {task.title}
                </button>
              ))}
            </div>
          )}

          {credentialMatches.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-graphite-dim">
                Vault
              </div>
              {credentialMatches.map((credential) => (
                <button
                  key={credential.id}
                  type="button"
                  onClick={() => {
                    onNavigate('vault')
                    onSelectCredential(credential.id)
                    close()
                  }}
                  className="block w-full truncate rounded-control px-2 py-1.5 text-left text-sm text-graphite hover:bg-line/40"
                >
                  {credential.title}
                  {credential.username ? ` — ${credential.username}` : ''}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-line px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-graphite-dim">
          [CTRL+K] toggle · [ESC] close
        </div>
      </div>
    </div>
  )
}
