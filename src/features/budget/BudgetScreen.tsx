import { useState } from 'react'
import { AccountsPanel } from './AccountsPanel'
import { BudgetsPanel } from './BudgetsPanel'
import { ReportsPanel } from './ReportsPanel'

type View = 'overview' | 'budgets' | 'reports'

const TABS: { id: View; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'budgets', label: 'Budgets' },
  { id: 'reports', label: 'Reports' }
]

export function BudgetScreen(): JSX.Element {
  const [view, setView] = useState<View>('overview')
  // Bumped whenever a transaction is created — every panel's numbers
  // (balances, month spend, charts) depend on the transaction ledger.
  const [refreshKey, setRefreshKey] = useState(0)
  const bump = (): void => setRefreshKey((k) => k + 1)

  return (
    <div className="flex h-full flex-1 flex-col">
      <div className="flex gap-1 border-b border-line p-3">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setView(tab.id)}
            className={`rounded-control px-3 py-1 text-sm ${
              view === tab.id ? 'bg-brass-tint font-medium text-graphite' : 'text-graphite-dim hover:bg-line/40'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {view === 'overview' && <AccountsPanel refreshKey={refreshKey} onChanged={bump} />}
      {view === 'budgets' && <BudgetsPanel refreshKey={refreshKey} />}
      {view === 'reports' && <ReportsPanel refreshKey={refreshKey} />}
    </div>
  )
}
