import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
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
      <h2 className="mb-3 text-sm font-medium text-neutral-500">Categories</h2>
      <div className="mb-6 flex gap-1">
        <input
          value={newCategoryName}
          onChange={(event) => setNewCategoryName(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && handleCreateCategory()}
          placeholder="New category"
          className="rounded border border-neutral-300 px-2 py-1 text-sm"
        />
        <select
          value={newCategoryKind}
          onChange={(event) => setNewCategoryKind(event.target.value as CategoryKind)}
          className="rounded border border-neutral-300 px-2 py-1 text-sm capitalize"
        >
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
        <button
          type="button"
          onClick={handleCreateCategory}
          className="rounded bg-neutral-900 px-3 py-1 text-sm text-white"
        >
          Add
        </button>
      </div>

      <h2 className="mb-3 text-sm font-medium text-neutral-500">Budgets (this month)</h2>
      <div className="space-y-3">
        {expenseCategories.map((category) => {
          const budget = budgetByCategory.get(category.id)

          if (!budget) {
            return (
              <div key={category.id} className="rounded border border-neutral-200 p-3">
                <div className="mb-2 text-sm font-medium">{category.name}</div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-400">No budget set</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Monthly limit"
                    value={limitDrafts[category.id] ?? ''}
                    onChange={(event) =>
                      setLimitDrafts((prev) => ({ ...prev, [category.id]: event.target.value }))
                    }
                    className="w-28 rounded border border-neutral-300 px-2 py-1 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleSetLimit(category.id)}
                    className="rounded bg-neutral-900 px-2 py-1 text-xs text-white"
                  >
                    Set
                  </button>
                </div>
              </div>
            )
          }

          const ratio = budget.limitAmount > 0 ? budget.monthSpend / budget.limitAmount : 0
          const status = ratio >= 1 ? 'over' : ratio >= budget.thresholdPct / 100 ? 'approaching' : 'ok'
          const barColor =
            status === 'over' ? 'bg-red-600' : status === 'approaching' ? 'bg-amber-500' : 'bg-neutral-900'
          const textColor =
            status === 'over' ? 'text-red-600' : status === 'approaching' ? 'text-amber-600' : 'text-neutral-500'

          return (
            <div key={category.id} className="rounded border border-neutral-200 p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium">{category.name}</span>
                <span className={`text-xs font-medium ${textColor}`}>
                  {budget.monthSpend.toLocaleString()} / {budget.limitAmount.toLocaleString()}
                  {status === 'over' && ' · Over budget'}
                  {status === 'approaching' && ' · Approaching limit'}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
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
                  className="w-28 rounded border border-neutral-300 px-2 py-1 text-xs"
                />
                <button
                  type="button"
                  onClick={() => handleSetLimit(category.id)}
                  className="rounded bg-neutral-100 px-2 py-1 text-xs text-neutral-600"
                >
                  Update
                </button>
              </div>
            </div>
          )
        })}
        {expenseCategories.length === 0 && (
          <p className="text-xs text-neutral-400">Create an expense category above to start budgeting.</p>
        )}
      </div>
    </div>
  )
}
