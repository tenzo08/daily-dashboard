import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import type { CredentialSummary } from '../../../electron/db/types'
import { CredentialForm } from './CredentialForm'

function CredentialRow({
  credential,
  onEdit
}: {
  credential: CredentialSummary
  onEdit: () => void
}): JSX.Element {
  const [revealed, setRevealed] = useState<string | null>(null)
  const [revealing, setRevealing] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleReveal(): Promise<void> {
    if (revealed !== null) {
      setRevealed(null)
      return
    }
    setRevealing(true)
    const secret = await api.credentials.reveal(credential.id)
    setRevealed(secret.password)
    setRevealing(false)
  }

  async function handleCopy(): Promise<void> {
    const secret = revealed ?? (await api.credentials.reveal(credential.id)).password
    await api.system.copyToClipboard(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-b-0">
      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <div className="truncate text-sm font-medium text-graphite">{credential.title}</div>
        <div className="truncate text-xs text-graphite-dim">
          {credential.username ?? '—'}
          {credential.folder ? ` · ${credential.folder}` : ''}
        </div>
      </button>
      <code className="w-32 truncate font-mono text-xs text-graphite-dim">
        {revealing ? 'Decrypting…' : (revealed ?? '••••••••••••')}
      </code>
      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          onClick={handleReveal}
          className="rounded-control px-2 py-1 text-[11px] text-graphite-dim hover:bg-line/40"
        >
          {revealed ? 'Hide' : 'Show'}
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-control px-2 py-1 text-[11px] text-graphite-dim hover:bg-line/40"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  )
}

interface VaultScreenProps {
  /** Set by the command palette (Ctrl+K) to deep-link straight to a credential. */
  initialCredentialId?: number
  onConsumedInitialSelection?: () => void
}

export function VaultScreen({ initialCredentialId, onConsumedInitialSelection }: VaultScreenProps): JSX.Element {
  const [credentials, setCredentials] = useState<CredentialSummary[]>([])
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<CredentialSummary | null>(null)
  const [showForm, setShowForm] = useState(false)
  const consumedIdRef = useRef<number | undefined>(undefined)

  const refresh = useCallback(async () => {
    setCredentials(await api.credentials.list())
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (initialCredentialId === undefined || consumedIdRef.current === initialCredentialId) return
    const credential = credentials.find((c) => c.id === initialCredentialId)
    if (credential) {
      setEditing(credential)
      setShowForm(true)
      consumedIdRef.current = initialCredentialId
      onConsumedInitialSelection?.()
    }
  }, [initialCredentialId, credentials, onConsumedInitialSelection])

  async function handleDelete(): Promise<void> {
    if (!editing) return
    await api.credentials.delete(editing.id)
    setShowForm(false)
    setEditing(null)
    refresh()
  }

  const filtered = credentials.filter((c) =>
    `${c.title} ${c.username ?? ''} ${c.folder ?? ''}`.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-graphite">My Vault</h1>
        <button
          type="button"
          onClick={() => {
            setEditing(null)
            setShowForm(true)
          }}
          className="rounded-control bg-brass px-3 py-1.5 text-sm font-semibold text-graphite hover:bg-brass-bright"
        >
          Add credential
        </button>
      </div>

      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search credentials…"
        className="mb-4 w-full max-w-sm rounded-control border border-line bg-surface px-3 py-1.5 text-sm text-graphite focus:border-brass focus:outline-none"
      />

      <Card className="p-0">
        {filtered.map((credential) => (
          <CredentialRow
            key={credential.id}
            credential={credential}
            onEdit={() => {
              setEditing(credential)
              setShowForm(true)
            }}
          />
        ))}
        {filtered.length === 0 && (
          <p className="p-4 text-xs text-graphite-dim">
            {credentials.length === 0 ? 'No credentials saved yet.' : 'No matches.'}
          </p>
        )}
      </Card>

      {showForm && (
        <CredentialForm
          initial={editing}
          onSaved={() => {
            setShowForm(false)
            setEditing(null)
            refresh()
          }}
          onCancel={() => {
            setShowForm(false)
            setEditing(null)
          }}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
