// Shape of window.api (ARCHITECTURE.md §6). Pure types only — no
// 'electron' or Node-specific imports — so both preload.ts (main-process
// side, implements this) and the renderer (src/, types window.api against
// this) can import it across the tsconfig.node/tsconfig.web boundary.
//
// Each domain starts as an empty placeholder and is filled in with real
// methods as its phase lands — see workflow_daily-dashboard.md.

import type {
  Account,
  AccountBalance,
  ActivityEntry,
  BudgetAlert,
  BudgetWithSpend,
  Category,
  CategorySpend,
  CredentialSecret,
  CredentialSummary,
  NewAccount,
  NewCategory,
  NewCredentialInput,
  NewNote,
  NewScheduleItem,
  NewTask,
  NewTransaction,
  Note,
  NoteFilter,
  NoteFolder,
  NoteSummary,
  ScheduleItem,
  ScheduleOccurrence,
  Tag,
  Task,
  TaskFilter,
  TaskStatus,
  Transaction,
  TransactionFilter
} from '../db/types'

export interface DashboardSnapshot {
  note: Note
  schedule: ScheduleOccurrence[]
  tasks: Task[]
  activity: ActivityEntry[]
  counts: {
    credentials: number
    notes: number
    openTasks: number
  }
  budgetSnapshot: {
    accountBalances: AccountBalance[]
    monthSpendByCategory: CategorySpend[]
    monthIncome: number
    alerts: BudgetAlert[]
  }
}

export interface VerifyPinResult {
  ok: boolean
  lockedUntilMs?: number
}

export interface ApiContract {
  auth: {
    isPinSet: () => Promise<boolean>
    setPin: (pin: string) => Promise<void>
    verifyPin: (pin: string) => Promise<VerifyPinResult>
    /** Wipes local data and relaunches the app (REQUIREMENTS.md OQ-1). */
    resetData: () => Promise<void>
    /** Drops the in-memory vault key; renderer separately swaps back to LockScreen. */
    lock: () => Promise<void>
  }

  notes: {
    listFolders: () => Promise<NoteFolder[]>
    createFolder: (name: string, parentId?: number | null) => Promise<NoteFolder>
    listNotes: (filter?: NoteFilter) => Promise<NoteSummary[]>
    getNote: (id: number) => Promise<Note | undefined>
    createNote: (input: NewNote) => Promise<Note>
    saveNote: (
      id: number,
      patch: { title?: string; bodyMd?: string; folderId?: number | null }
    ) => Promise<Note>
    getOrCreateDailyNote: () => Promise<Note>
    listTags: () => Promise<Tag[]>
    tagsForNote: (noteId: number) => Promise<Tag[]>
    addTagToNote: (noteId: number, tagName: string) => Promise<Tag>
    removeTagFromNote: (noteId: number, tagId: number) => Promise<void>
  }

  schedule: {
    listOccurrences: (rangeStartISO: string, rangeEndISO: string) => Promise<ScheduleOccurrence[]>
    /** All schedule items (not expanded into occurrences) — used by the task-link picker. */
    listItems: () => Promise<ScheduleItem[]>
    getItem: (id: number) => Promise<ScheduleItem | undefined>
    createItem: (input: NewScheduleItem) => Promise<ScheduleItem>
    updateItem: (id: number, patch: Partial<NewScheduleItem>) => Promise<ScheduleItem>
    deleteItem: (id: number) => Promise<void>
    toggleCompletion: (itemId: number, occurrenceDate: string) => Promise<void>
  }

  accounts: {
    list: (includeArchived?: boolean) => Promise<Account[]>
    create: (input: NewAccount) => Promise<Account>
    update: (id: number, patch: Partial<NewAccount>) => Promise<Account>
    archive: (id: number) => Promise<void>
    getBalances: () => Promise<AccountBalance[]>
  }

  transactions: {
    list: (filter?: TransactionFilter) => Promise<Transaction[]>
    create: (input: NewTransaction) => Promise<Transaction>
    update: (id: number, patch: Partial<NewTransaction>) => Promise<Transaction>
    delete: (id: number) => Promise<void>
  }

  categories: {
    list: () => Promise<Category[]>
    create: (input: NewCategory) => Promise<Category>
  }

  budgets: {
    list: () => Promise<BudgetWithSpend[]>
    set: (categoryId: number, limitAmount: number, thresholdPct?: number) => Promise<void>
  }

  credentials: {
    list: () => Promise<CredentialSummary[]>
    create: (input: NewCredentialInput) => Promise<CredentialSummary>
    update: (id: number, patch: Partial<NewCredentialInput>) => Promise<CredentialSummary>
    delete: (id: number) => Promise<void>
    /** Decrypts on demand — list() never returns plaintext (see credentials.ipc.ts). */
    reveal: (id: number) => Promise<CredentialSecret>
  }

  tasks: {
    list: (filter?: TaskFilter) => Promise<Task[]>
    create: (input: NewTask) => Promise<Task>
    update: (id: number, patch: Partial<NewTask>) => Promise<Task>
    setStatus: (id: number, status: TaskStatus) => Promise<Task>
    delete: (id: number) => Promise<void>
  }

  activity: {
    list: (limit?: number) => Promise<ActivityEntry[]>
  }

  system: {
    copyToClipboard: (text: string) => Promise<void>
  }

  dashboard: {
    getToday: () => Promise<DashboardSnapshot>
  }

  settings: {
    getLaunchTime: () => Promise<string>
    /** Also re-registers the Task Scheduler entry (ARCHITECTURE.md §5.3). */
    setLaunchTime: (time: string) => Promise<void>
    /** 0 = disabled. */
    getIdleLockMinutes: () => Promise<number>
    setIdleLockMinutes: (minutes: number) => Promise<void>
    /** 0 = keep forever. */
    getActivityRetentionDays: () => Promise<number>
    setActivityRetentionDays: (days: number) => Promise<void>
  }

  backup: {
    /** Opens a native save dialog; { path: null } if the user cancelled. */
    export: () => Promise<{ path: string | null }>
    /** Opens a native open dialog; only succeeds into a completely empty vault. */
    import: () => Promise<{ imported: boolean; path: string | null }>
  }
}
