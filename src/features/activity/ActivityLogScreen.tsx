import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import type { ActivityEntry } from '../../../electron/db/types'

const HISTORY_LIMIT = 200

function formatTimestamp(iso: string): string {
  const date = new Date(iso.endsWith('Z') || iso.includes('T') ? iso : `${iso.replace(' ', 'T')}Z`)
  return date.toLocaleString(undefined, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function ActivityLogScreen(): JSX.Element {
  const [entries, setEntries] = useState<ActivityEntry[]>([])

  useEffect(() => {
    api.activity.list(HISTORY_LIMIT).then(setEntries)
  }, [])

  return (
    <div className="flex-1 overflow-auto p-6">
      <h1 className="mb-1 text-lg font-semibold text-graphite">Activity Log</h1>
      <p className="mb-4 text-xs text-graphite-dim">A local, append-only record of what&apos;s changed — nothing leaves this machine.</p>

      <Card className="p-0">
        {entries.map((entry) => (
          <div key={entry.id} className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5 last:border-b-0">
            <span className="text-sm text-graphite">{entry.message}</span>
            <span className="shrink-0 font-mono text-[11px] tabular-nums text-graphite-dim">
              {formatTimestamp(entry.createdAt)}
            </span>
          </div>
        ))}
        {entries.length === 0 && <p className="p-4 text-xs text-graphite-dim">Nothing logged yet.</p>}
      </Card>
    </div>
  )
}
