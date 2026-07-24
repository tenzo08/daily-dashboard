// Shared domain types for the data layer (ARCHITECTURE.md §4/§6).
// Plain data shapes only — no Electron imports, so repositories stay
// testable outside the app (workflow_daily-dashboard.md P1 checkpoint).

export type AccountType = 'cash' | 'bank' | 'credit' | 'other'

export interface Account {
  id: number
  name: string
  type: AccountType
  initialBalance: number
  currency: string
  archived: boolean
  createdAt: string
}

export interface NewAccount {
  name: string
  type: AccountType
  initialBalance?: number
  currency?: string
}

export interface AccountBalance {
  accountId: number
  balance: number
}

export type CategoryKind = 'expense' | 'income'

export interface Category {
  id: number
  name: string
  kind: CategoryKind
  color: string | null
}

export interface NewCategory {
  name: string
  kind: CategoryKind
  color?: string
}

export interface Budget {
  categoryId: number
  limitAmount: number
  thresholdPct: number
  updatedAt: string
}

export interface BudgetWithSpend extends Budget {
  categoryName: string
  monthSpend: number
}

export interface CategorySpend {
  categoryId: number
  categoryName: string
  amount: number
}

export type TransactionType = 'expense' | 'income' | 'transfer'

export interface Transaction {
  id: number
  accountId: number
  categoryId: number | null
  type: TransactionType
  amount: number
  occurredOn: string
  note: string | null
  transferAccountId: number | null
  createdAt: string
}

export interface NewTransaction {
  accountId: number
  categoryId?: number | null
  type: TransactionType
  amount: number
  occurredOn: string
  note?: string
  transferAccountId?: number | null
}

export interface TransactionFilter {
  accountId?: number
  categoryId?: number
  from?: string
  to?: string
}

export interface NoteFolder {
  id: number
  name: string
  parentId: number | null
}

export interface Note {
  id: number
  folderId: number | null
  title: string
  bodyMd: string
  isDaily: boolean
  noteDate: string | null
  createdAt: string
  updatedAt: string
}

export interface NoteSummary {
  id: number
  folderId: number | null
  title: string
  isDaily: boolean
  noteDate: string | null
  updatedAt: string
}

export interface NewNote {
  title: string
  folderId?: number | null
  bodyMd?: string
}

export interface NoteFilter {
  folderId?: number
  tagId?: number
}

export interface Tag {
  id: number
  name: string
}

export type RecurrenceRule = string

export interface ScheduleItem {
  id: number
  title: string
  description: string | null
  startAt: string
  endAt: string | null
  allDay: boolean
  recurrenceRule: RecurrenceRule | null
  recurrenceEndAt: string | null
  reminderMinutesBefore: number | null
  createdAt: string
}

export interface NewScheduleItem {
  title: string
  description?: string
  startAt: string
  endAt?: string
  allDay?: boolean
  recurrenceRule?: RecurrenceRule
  recurrenceEndAt?: string
  reminderMinutesBefore?: number
}

export interface ScheduleOccurrence {
  itemId: number
  title: string
  description: string | null
  occurrenceAt: string
  occurrenceDate: string
  allDay: boolean
  reminderMinutesBefore: number | null
  completed: boolean
  skipped: boolean
}
