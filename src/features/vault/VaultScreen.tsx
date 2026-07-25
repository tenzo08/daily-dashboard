import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { StatusPill, type StatusPillTone } from '@/components/ui/StatusPill'
import type { CredentialHealthIssue, CredentialSummary } from '../../../electron/db/types'
import { CredentialForm } from './CredentialForm'

const ISSUE_LABEL: Record<CredentialHealthIssue, string> = { weak: 'Weak', reused: 'Reused', old: 'Old' }
const ISSUE_TONE: Record<CredentialHealthIssue, StatusPillTone> = { weak: 'danger', reused: 'warning', old: 'muted' }

function CredentialRow({
  credential,
  issues,
  onEdit
}: {
  credential: CredentialSummary
  issues: CredentialHealthIssue[]
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
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-graphite">{credential.title}</span>
          {issues.map((issue) => (
            <StatusPill key={issue} tone={ISSUE_TONE[issue]}>
              {ISSUE_LABEL[issue]}
            </StatusPill>
          ))}
        </div>
        <div className="truncate text-xs text-graphite-dim">
          {credential.username ?? '—'}
          {credential.folder ? ` · ${credential.folder}` : ''}
        </div>
      </button>
      <code
        className={`shrink-0 font-mono text-xs text-graphite-dim ${
          revealed !== null
            ? 'w-56 overflow-x-auto whitespace-nowrap'
            : 'w-32 truncate'
        }`}
      >
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
  const [health, setHealth] = useState<Map<number, CredentialHealthIssue[]>>(new Map())
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<CredentialSummary | null>(null)
  const [showForm, setShowForm] = useState(false)
  const consumedIdRef = useRef<number | undefined>(undefined)

  const refresh = useCallback(async () => {
    const [list, healthEntries] = await Promise.all([api.credentials.list(), api.credentials.health()])
    setCredentials(list)
    setHealth(new Map(healthEntries.map((e) => [e.id, e.issues])))
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
  const flaggedCount = health.size

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

      {flaggedCount > 0 && (
        <div className="mb-4 rounded-card border border-warning/30 bg-warning-tint px-3.5 py-2 text-sm text-graphite">
          <strong className="font-medium">{flaggedCount}</strong> {flaggedCount === 1 ? 'password needs' : 'passwords need'} attention — look for the Weak / Reused / Old tags below.
        </div>
      )}

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
            issues={health.get(credential.id) ?? []}
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
