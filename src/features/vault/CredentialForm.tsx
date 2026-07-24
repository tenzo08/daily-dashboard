import { useEffect, useState, type FormEvent } from 'react'
import { api } from '@/lib/api'
import { PasswordField } from '@/components/ui/PasswordField'
import type { CredentialSummary } from '../../../electron/db/types'
import { GeneratePasswordPanel } from './GeneratePasswordPanel'

interface CredentialFormProps {
  initial: CredentialSummary | null
  onSaved: () => void
  onCancel: () => void
  onDelete: () => void
}

export function CredentialForm({ initial, onSaved, onCancel, onDelete }: CredentialFormProps): JSX.Element {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [username, setUsername] = useState(initial?.username ?? '')
  const [url, setUrl] = useState(initial?.url ?? '')
  const [folder, setFolder] = useState(initial?.folder ?? '')
  const [password, setPassword] = useState('')
  const [notes, setNotes] = useState('')
  const [showGenerator, setShowGenerator] = useState(!initial)
  const [loading, setLoading] = useState(Boolean(initial))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!initial) return
    let cancelled = false
    api.credentials.reveal(initial.id).then((secret) => {
      if (cancelled) return
      setPassword(secret.password)
      setNotes(secret.notes ?? '')
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [initial])

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!title.trim() || !password) return
    setSaving(true)

    const input = {
      title: title.trim(),
      username: username.trim() || undefined,
      url: url.trim() || undefined,
      folder: folder.trim() || undefined,
      password,
      notes: notes.trim() || undefined
    }

    if (initial) {
      await api.credentials.update(initial.id, input)
    } else {
      await api.credentials.create(input)
    }
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-void/40">
      <form
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-[26rem] overflow-auto rounded-panel border border-line bg-surface p-5"
      >
        <h2 className="mb-4 text-sm font-semibold text-graphite">{initial ? 'Edit credential' : 'Add credential'}</h2>

        {loading ? (
          <p className="text-xs text-graphite-dim">Decrypting…</p>
        ) : (
          <div className="space-y-3">
            <label className="block text-xs text-graphite-dim">
              Title
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                autoFocus
                required
                className="mt-1 w-full rounded-control border border-line bg-paper px-2 py-1.5 text-sm text-graphite focus:border-brass focus:outline-none"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs text-graphite-dim">
                Username / email
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="mt-1 w-full rounded-control border border-line bg-paper px-2 py-1.5 text-sm text-graphite focus:border-brass focus:outline-none"
                />
              </label>
              <label className="block text-xs text-graphite-dim">
                Folder
                <input
                  value={folder}
                  onChange={(event) => setFolder(event.target.value)}
                  placeholder="Work, Personal…"
                  className="mt-1 w-full rounded-control border border-line bg-paper px-2 py-1.5 text-sm text-graphite focus:border-brass focus:outline-none"
                />
              </label>
            </div>

            <label className="block text-xs text-graphite-dim">
              URL
              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://…"
                className="mt-1 w-full rounded-control border border-line bg-paper px-2 py-1.5 text-sm text-graphite focus:border-brass focus:outline-none"
              />
            </label>

            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-graphite-dim">
                <span>Password</span>
                <button
                  type="button"
                  onClick={() => setShowGenerator((v) => !v)}
                  className="text-brass hover:underline"
                >
                  {showGenerator ? 'Hide generator' : 'Generate'}
                </button>
              </div>
              <PasswordField
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                surface="light"
                align="left"
              />
            </div>

            {showGenerator && (
              <div className="rounded-control border border-line bg-paper p-3">
                <GeneratePasswordPanel onUse={(generated) => setPassword(generated)} />
              </div>
            )}

            <label className="block text-xs text-graphite-dim">
              Notes
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={2}
                className="mt-1 w-full rounded-control border border-line bg-paper px-2 py-1.5 text-sm text-graphite focus:border-brass focus:outline-none"
              />
            </label>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <div>
            {initial && (
              <button type="button" onClick={onDelete} className="text-xs text-danger hover:underline">
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-control px-3 py-1.5 text-sm text-graphite-dim hover:bg-line/40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || loading || !title.trim() || !password}
              className="rounded-control bg-brass px-3 py-1.5 text-sm font-semibold text-graphite hover:bg-brass-bright disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
