// Shape of window.api (ARCHITECTURE.md §6). Pure types only — no
// 'electron' or Node-specific imports — so both preload.ts (main-process
// side, implements this) and the renderer (src/, types window.api against
// this) can import it across the tsconfig.node/tsconfig.web boundary.
//
// Each domain starts as an empty placeholder and is filled in with real
// methods as its phase lands (P7 budget, P9 dashboard, P11 settings) —
// see workflow_daily-dashboard.md.

import type {
  NewNote,
  NewScheduleItem,
  Note,
  NoteFilter,
  NoteFolder,
  NoteSummary,
  ScheduleItem,
  ScheduleOccurrence,
  Tag
} from '../db/types'

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
    getItem: (id: number) => Promise<ScheduleItem | undefined>
    createItem: (input: NewScheduleItem) => Promise<ScheduleItem>
    updateItem: (id: number, patch: Partial<NewScheduleItem>) => Promise<ScheduleItem>
    deleteItem: (id: number) => Promise<void>
    toggleCompletion: (itemId: number, occurrenceDate: string) => Promise<void>
  }

  accounts: Record<string, never>
  transactions: Record<string, never>
  categories: Record<string, never>
  budgets: Record<string, never>
  settings: Record<string, never>
  dashboard: Record<string, never>
}
