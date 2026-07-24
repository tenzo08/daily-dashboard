import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { StatusPill } from '@/components/ui/StatusPill'
import type { BudgetWithSpend, Category, CategoryKind } from '../../../electron/db/types'

interface BudgetsPanelProps {
  refreshKey: number
}

export function BudgetsPanel({ refreshKey }: BudgetsPanelProps): JSX.Element {
  const [categories, setCategories] = useState<Category[]>([])
  const [budgets, setBudgets] = useState<BudgetWithSpend[]>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryKind, setNewCategoryKind] = useState<CategoryKind>('expense')
  const [limitDrafts, setLimitDrafts] = useState<Record<number, string>>({})

  const refresh = useCallback(async () => {
    const [cats, buds] = await Promise.all([api.categories.list(), api.budgets.list()])
    setCategories(cats)
    setBudgets(buds)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh, refreshKey])

  async function handleCreateCategory(): Promise<void> {
    const name = newCategoryName.trim()
    if (!name) return
    await api.categories.create({ name, kind: newCategoryKind })
    setNewCategoryName('')
    refresh()
  }

  async function handleSetLimit(categoryId: number): Promise<void> {
    const amount = Number(limitDrafts[categoryId])
    if (!amount || amount <= 0) return
    await api.budgets.set(categoryId, amount, 90)
    setLimitDrafts((prev) => ({ ...prev, [categoryId]: '' }))
    refresh()
  }

  const expenseCategories = categories.filter((c) => c.kind === 'expense')
  const budgetByCategory = new Map(budgets.map((b) => [b.categoryId, b]))

  return (
    <div className="flex-1 overflow-auto p-4">
      <h2 className="mb-3 text-sm font-medium text-graphite-dim">Categories</h2>
      <div className="mb-6 flex gap-1">
        <input
          value={newCategoryName}
          onChange={(event) => setNewCategoryName(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && handleCreateCategory()}
          placeholder="New category"
          className="rounded-control border border-line bg-surface px-2 py-1 text-sm text-graphite focus:border-brass focus:outline-none"
        />
        <select
          value={newCategoryKind}
          onChange={(event) => setNewCategoryKind(event.target.value as CategoryKind)}
          className="rounded-control border border-line bg-surface px-2 py-1 text-sm capitalize text-graphite focus:border-brass focus:outline-none"
        >
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
        <button
          type="button"
          onClick={handleCreateCategory}
          className="rounded-control bg-brass px-3 py-1 text-sm font-semibold text-graphite hover:bg-brass-bright"
        >
          Add
        </button>
      </div>

      <h2 className="mb-3 text-sm font-medium text-graphite-dim">Budgets (this month)</h2>
      <div className="space-y-3">
        {expenseCategories.map((category) => {
          const budget = budgetByCategory.get(category.id)

          if (!budget) {
            return (
              <div key={category.id} className="rounded-card border border-line bg-surface p-3">
                <div className="mb-2 text-sm font-medium text-graphite">{category.name}</div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-graphite-dim">No budget set</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Monthly limit"
                    value={limitDrafts[category.id] ?? ''}
                    onChange={(event) =>
                      setLimitDrafts((prev) => ({ ...prev, [category.id]: event.target.value }))
                    }
                    className="w-28 rounded-control border border-line bg-paper px-2 py-1 text-xs text-graphite focus:border-brass focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleSetLimit(category.id)}
                    className="rounded-control bg-brass px-2 py-1 text-xs font-semibold text-graphite hover:bg-brass-bright"
                  >
                    Set
                  </button>
                </div>
              </div>
            )
          }

          const ratio = budget.limitAmount > 0 ? budget.monthSpend / budget.limitAmount : 0
          const status = ratio >= 1 ? 'over' : ratio >= budget.thresholdPct / 100 ? 'approaching' : 'ok'
          const barColor = status === 'over' ? 'bg-danger' : status === 'approaching' ? 'bg-warning' : 'bg-brass'

          return (
            <div key={category.id} className="rounded-card border border-line bg-surface p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium text-graphite">{category.name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs tabular-nums text-graphite-dim">
                    {budget.monthSpend.toLocaleString()} / {budget.limitAmount.toLocaleString()}
                  </span>
                  {status === 'over' && <StatusPill tone="danger">Over budget</StatusPill>}
                  {status === 'approaching' && <StatusPill tone="warning">Approaching limit</StatusPill>}
                </div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-pill bg-line">
                <div className={`h-full ${barColor}`} style={{ width: `${Math.min(ratio * 100, 100)}%` }} />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder="Update limit"
                  value={limitDrafts[category.id] ?? ''}
                  onChange={(event) =>
                    setLimitDrafts((prev) => ({ ...prev, [category.id]: event.target.value }))
                  }
                  className="w-28 rounded-control border border-line bg-paper px-2 py-1 text-xs text-graphite focus:border-brass focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleSetLimit(category.id)}
                  className="rounded-control bg-muted-tint px-2 py-1 text-xs text-muted hover:text-graphite"
                >
                  Update
                </button>
              </div>
            </div>
          )
        })}
        {expenseCategories.length === 0 && (
          <p className="text-xs text-graphite-dim">Create an expense category above to start budgeting.</p>
        )}
      </div>
    </div>
  )
}
