import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'

interface ReportsPanelProps {
  refreshKey: number
}

// Validated categorical palette (dataviz skill, references/palette.md) —
// fixed hue order, assigned by each category's stable creation-order index,
// never re-cycled or re-sorted by value. Light mode only — this app has no
// dark-mode theme system yet.
const CATEGORICAL_COLORS = [
  '#2a78d6', // blue
  '#eb6834', // orange
  '#1baf7a', // aqua
  '#eda100', // yellow
  '#e87ba4', // magenta
  '#008300', // green
  '#4a3aa7', // violet
  '#e34948' // red
]
const TREND_COLOR = '#2a78d6' // single series — no legend needed (non-negotiable: legend only for ≥2)
const GRID_COLOR = '#e1e0d9'
const AXIS_COLOR = '#c3c2b7'
const MUTED_TEXT = '#898781'

function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7)
}

function monthStartEnd(monthsAgo: number): { start: string; end: string } {
  const now = new Date()
  const target = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1)
  const start = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-01`
  const endDate = new Date(target.getFullYear(), target.getMonth() + 1, 0)
  const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(
    endDate.getDate()
  ).padStart(2, '0')}`
  return { start, end }
}

export function ReportsPanel({ refreshKey }: ReportsPanelProps): JSX.Element {
  const [byCategory, setByCategory] = useState<{ name: string; amount: number; color: string }[]>([])
  const [trend, setTrend] = useState<{ month: string; amount: number }[]>([])

  const refresh = useCallback(async () => {
    const categories = await api.categories.list()
    const expenseCategories = categories.filter((c) => c.kind === 'expense')

    const { start: monthStart, end: monthEnd } = monthStartEnd(0)
    const thisMonthTxns = await api.transactions.list({ from: monthStart, to: monthEnd })
    const spendByCategory = new Map<number, number>()
    for (const txn of thisMonthTxns) {
      if (txn.type !== 'expense' || txn.categoryId === null) continue
      spendByCategory.set(txn.categoryId, (spendByCategory.get(txn.categoryId) ?? 0) + txn.amount)
    }
    setByCategory(
      expenseCategories
        .map((category, index) => ({
          name: category.name,
          amount: spendByCategory.get(category.id) ?? 0,
          color: CATEGORICAL_COLORS[index % CATEGORICAL_COLORS.length]
        }))
        .filter((row) => row.amount > 0)
    )

    const rangeStart = monthStartEnd(5).start
    const trendTxns = await api.transactions.list({ from: rangeStart, to: monthEnd })
    const spendByMonth = new Map<string, number>()
    for (let i = 5; i >= 0; i--) {
      spendByMonth.set(monthKey(monthStartEnd(i).start), 0)
    }
    for (const txn of trendTxns) {
      if (txn.type !== 'expense') continue
      const key = monthKey(txn.occurredOn)
      if (spendByMonth.has(key)) {
        spendByMonth.set(key, (spendByMonth.get(key) ?? 0) + txn.amount)
      }
    }
    setTrend(Array.from(spendByMonth.entries()).map(([month, amount]) => ({ month, amount })))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh, refreshKey])

  return (
    <div className="flex-1 overflow-auto p-4">
      <h2 className="mb-3 text-sm font-medium text-neutral-500">Spend by category (this month)</h2>
      <div className="mb-8 h-64 rounded border border-neutral-200 p-3">
        {byCategory.length === 0 ? (
          <p className="text-xs text-neutral-400">No expenses recorded this month yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byCategory} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <CartesianGrid vertical={false} stroke={GRID_COLOR} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: MUTED_TEXT }}
                axisLine={{ stroke: AXIS_COLOR }}
                tickLine={false}
              />
              <YAxis tick={{ fontSize: 11, fill: MUTED_TEXT }} axisLine={false} tickLine={false} width={40} />
              <Tooltip
                cursor={{ fill: '#f9f9f7' }}
                contentStyle={{ fontSize: 12, borderRadius: 6, border: `1px solid ${GRID_COLOR}` }}
                formatter={(value) => (typeof value === 'number' ? value.toLocaleString() : String(value))}
              />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {byCategory.map((row) => (
                  <Cell key={row.name} fill={row.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <h2 className="mb-3 text-sm font-medium text-neutral-500">Expense trend (last 6 months)</h2>
      <div className="h-64 rounded border border-neutral-200 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trend} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid vertical={false} stroke={GRID_COLOR} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: MUTED_TEXT }}
              axisLine={{ stroke: AXIS_COLOR }}
              tickLine={false}
            />
            <YAxis tick={{ fontSize: 11, fill: MUTED_TEXT }} axisLine={false} tickLine={false} width={40} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 6, border: `1px solid ${GRID_COLOR}` }}
              formatter={(value) => (typeof value === 'number' ? value.toLocaleString() : String(value))}
            />
            <Line
              type="monotone"
              dataKey="amount"
              stroke={TREND_COLOR}
              strokeWidth={2}
              dot={{ r: 3, fill: TREND_COLOR }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
