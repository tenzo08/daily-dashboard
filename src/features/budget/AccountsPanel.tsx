import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { Account, AccountType, Category, Transaction } from '../../../electron/db/types'
import { TransactionForm } from './TransactionForm'

interface AccountsPanelProps {
  refreshKey: number
  onChanged: () => void
}

interface AccountWithBalance extends Account {
  balance: number
}

const ACCOUNT_TYPES: AccountType[] = ['cash', 'bank', 'credit', 'other']

export function AccountsPanel({ refreshKey, onChanged }: AccountsPanelProps): JSX.Element {
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [newAccountName, setNewAccountName] = useState('')
  const [newAccountType, setNewAccountType] = useState<AccountType>('cash')
  const [showForm, setShowForm] = useState(false)

  const refresh = useCallback(async () => {
    const [list, balances, txns, cats] = await Promise.all([
      api.accounts.list(),
      api.accounts.getBalances(),
      api.transactions.list(),
      api.categories.list()
    ])
    const balanceMap = new Map(balances.map((b) => [b.accountId, b.balance]))
    setAccounts(list.map((account) => ({ ...account, balance: balanceMap.get(account.id) ?? account.initialBalance })))
    setTransactions(txns.slice(0, 15))
    setCategories(cats)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh, refreshKey])

  async function handleCreateAccount(): Promise<void> {
    const name = newAccountName.trim()
    if (!name) return
    await api.accounts.create({ name, type: newAccountType })
    setNewAccountName('')
    refresh()
  }

  function accountName(id: number): string {
    return accounts.find((a) => a.id === id)?.name ?? '—'
  }

  function categoryName(id: number | null): string | null {
    if (id === null) return null
    return categories.find((c) => c.id === id)?.name ?? null
  }

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium text-graphite-dim">Accounts</h2>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          disabled={accounts.length === 0}
          className="rounded-control bg-brass px-3 py-1 text-xs font-semibold text-graphite hover:bg-brass-bright disabled:opacity-40"
        >
          Add transaction
        </button>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        {accounts.map((account) => (
          <div key={account.id} className="rounded-card border border-line bg-surface p-3">
            <div className="font-mono text-[11px] uppercase tracking-wider text-graphite-dim">{account.type}</div>
            <div className="truncate text-sm font-medium text-graphite">{account.name}</div>
            <div
              className={`mt-1 font-mono text-lg font-semibold tabular-nums ${account.balance < 0 ? 'text-danger' : 'text-graphite'}`}
            >
              {account.balance.toLocaleString(undefined, { style: 'currency', currency: account.currency })}
            </div>
          </div>
        ))}
      </div>

      <div className="mb-6 flex gap-1">
        <input
          value={newAccountName}
          onChange={(event) => setNewAccountName(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && handleCreateAccount()}
          placeholder="New account name"
          className="rounded-control border border-line bg-surface px-2 py-1 text-sm text-graphite focus:border-brass focus:outline-none"
        />
        <select
          value={newAccountType}
          onChange={(event) => setNewAccountType(event.target.value as AccountType)}
          className="rounded-control border border-line bg-surface px-2 py-1 text-sm capitalize text-graphite focus:border-brass focus:outline-none"
        >
          {ACCOUNT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleCreateAccount}
          className="rounded-control bg-brass px-3 py-1 text-sm font-semibold text-graphite hover:bg-brass-bright"
        >
          Add account
        </button>
      </div>

      <h2 className="mb-2 text-sm font-medium text-graphite-dim">Recent transactions</h2>
      <ul className="divide-y divide-line rounded-card border border-line bg-surface">
        {transactions.map((txn) => (
          <li key={txn.id} className="flex items-center justify-between px-3 py-2 text-sm">
            <div>
              <div className="font-medium text-graphite">
                {txn.type === 'transfer'
                  ? `${accountName(txn.accountId)} → ${accountName(txn.transferAccountId ?? -1)}`
                  : (categoryName(txn.categoryId) ?? 'Uncategorized')}
              </div>
              <div className="text-xs text-graphite-dim">
                {accountName(txn.accountId)} · {txn.occurredOn} {txn.note ? `· ${txn.note}` : ''}
              </div>
            </div>
            <div
              className={`font-mono font-medium tabular-nums ${
                txn.type === 'income' ? 'text-success' : txn.type === 'expense' ? 'text-danger' : 'text-graphite-dim'
              }`}
            >
              {txn.type === 'expense' ? '-' : txn.type === 'income' ? '+' : ''}
              {txn.amount.toLocaleString()}
            </div>
          </li>
        ))}
        {transactions.length === 0 && <li className="px-3 py-2 text-xs text-graphite-dim">No transactions yet</li>}
      </ul>

      {showForm && (
        <TransactionForm
          accounts={accounts}
          onSaved={() => {
            setShowForm(false)
            refresh()
            onChanged()
          }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
