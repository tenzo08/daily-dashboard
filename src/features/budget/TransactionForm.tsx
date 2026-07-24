import { useEffect, useState, type FormEvent } from 'react'
import { api } from '@/lib/api'
import type { Account, Category, TransactionType } from '../../../electron/db/types'

interface TransactionFormProps {
  accounts: Account[]
  onSaved: () => void
  onCancel: () => void
}

function todayDateInput(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function TransactionForm({ accounts, onSaved, onCancel }: TransactionFormProps): JSX.Element {
  const [categories, setCategories] = useState<Category[]>([])
  const [type, setType] = useState<TransactionType>('expense')
  const [accountId, setAccountId] = useState<number | ''>(accounts[0]?.id ?? '')
  const [transferAccountId, setTransferAccountId] = useState<number | ''>('')
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [amount, setAmount] = useState('')
  const [occurredOn, setOccurredOn] = useState(todayDateInput())
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.categories.list().then(setCategories)
  }, [])

  const relevantCategories = categories.filter((c) => c.kind === (type === 'income' ? 'income' : 'expense'))

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    const amountNum = Number(amount)
    if (!accountId || !amountNum || amountNum <= 0) return
    if (type === 'transfer' && !transferAccountId) return
    setSaving(true)

    await api.transactions.create({
      accountId: Number(accountId),
      categoryId: type === 'transfer' ? undefined : categoryId ? Number(categoryId) : undefined,
      type,
      amount: amountNum,
      occurredOn,
      note: note.trim() || undefined,
      transferAccountId: type === 'transfer' ? Number(transferAccountId) : undefined
    })

    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-void/40">
      <form onSubmit={handleSubmit} className="w-80 rounded-panel border border-line bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold text-graphite">New transaction</h2>

        <div className="mb-2 flex gap-1">
          {(['expense', 'income', 'transfer'] as TransactionType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex-1 rounded-control px-2 py-1 text-xs capitalize ${
                type === t ? 'bg-brass text-graphite' : 'bg-muted-tint text-muted'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <label className="mb-2 block text-xs text-graphite-dim">
          {type === 'transfer' ? 'From account' : 'Account'}
          <select
            value={accountId}
            onChange={(event) => setAccountId(Number(event.target.value))}
            className="mt-0.5 w-full rounded-control border border-line bg-paper px-2 py-1 text-sm text-graphite focus:border-brass focus:outline-none"
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </label>

        {type === 'transfer' && (
          <label className="mb-2 block text-xs text-graphite-dim">
            To account
            <select
              value={transferAccountId}
              onChange={(event) => setTransferAccountId(Number(event.target.value))}
              className="mt-0.5 w-full rounded-control border border-line bg-paper px-2 py-1 text-sm text-graphite focus:border-brass focus:outline-none"
            >
              <option value="">Select account</option>
              {accounts
                .filter((account) => account.id !== accountId)
                .map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
            </select>
          </label>
        )}

        {type !== 'transfer' && (
          <label className="mb-2 block text-xs text-graphite-dim">
            Category
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value ? Number(event.target.value) : '')}
              className="mt-0.5 w-full rounded-control border border-line bg-paper px-2 py-1 text-sm text-graphite focus:border-brass focus:outline-none"
            >
              <option value="">Uncategorized</option>
              {relevantCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="mb-2 flex gap-2">
          <label className="flex-1 text-xs text-graphite-dim">
            Amount
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="mt-0.5 w-full rounded-control border border-line bg-paper px-2 py-1 text-sm text-graphite focus:border-brass focus:outline-none"
            />
          </label>
          <label className="flex-1 text-xs text-graphite-dim">
            Date
            <input
              type="date"
              value={occurredOn}
              onChange={(event) => setOccurredOn(event.target.value)}
              className="mt-0.5 w-full rounded-control border border-line bg-paper px-2 py-1 text-sm text-graphite focus:border-brass focus:outline-none"
            />
          </label>
        </div>

        <label className="mb-3 block text-xs text-graphite-dim">
          Note
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="mt-0.5 w-full rounded-control border border-line bg-paper px-2 py-1 text-sm text-graphite focus:border-brass focus:outline-none"
          />
        </label>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-control px-3 py-1.5 text-sm text-graphite-dim hover:bg-line/40"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !accountId || !amount}
            className="rounded-control bg-brass px-3 py-1.5 text-sm font-semibold text-graphite hover:bg-brass-bright disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  )
}
