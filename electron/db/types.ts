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

export interface BudgetAlert {
  categoryId: number
  categoryName: string
  monthSpend: number
  limitAmount: number
  status: 'over' | 'approaching'
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

// ---- Vault (credentials) ----
// Repositories only ever see the encrypted blob — encryption/decryption
// happens in electron/ipc/credentials.ipc.ts, the one place that also has
// the in-memory vault key (electron/lock/vaultSession.ts).

export interface EncryptedSecret {
  secretCipher: string
  secretIv: string
  secretTag: string
}

export interface CredentialRow extends EncryptedSecret {
  id: number
  title: string
  username: string | null
  url: string | null
  folder: string | null
  createdAt: string
  updatedAt: string
}

export interface CredentialSummary {
  id: number
  title: string
  username: string | null
  url: string | null
  folder: string | null
  updatedAt: string
}

export interface NewCredentialRow {
  title: string
  username?: string | null
  url?: string | null
  folder?: string | null
  secretCipher: string
  secretIv: string
  secretTag: string
}

export interface CredentialSecret {
  password: string
  notes: string | null
}

/** Renderer-facing input — plaintext password, encrypted by credentials.ipc.ts before it touches disk. */
export interface NewCredentialInput {
  title: string
  username?: string
  url?: string
  folder?: string
  password: string
  notes?: string
}

// ---- Tasks ----

export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface Task {
  id: number
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  dueDate: string | null
  completedAt: string | null
  /** "Link notes ↔ tasks ↔ schedule" — a task can reference the note or
   *  schedule item it came from. Independent, both optional, no exclusivity. */
  linkedNoteId: number | null
  linkedScheduleItemId: number | null
  createdAt: string
  updatedAt: string
}

export interface NewTask {
  title: string
  description?: string
  priority?: TaskPriority
  dueDate?: string
  linkedNoteId?: number | null
  linkedScheduleItemId?: number | null
}

export interface TaskFilter {
  status?: TaskStatus
  linkedNoteId?: number
  linkedScheduleItemId?: number
}

// ---- Activity log ----

export interface ActivityEntry {
  id: number
  eventType: string
  message: string
  createdAt: string
}
