// Shape of window.api (ARCHITECTURE.md §6). Pure types only — no
// 'electron' or Node-specific imports — so both preload.ts (main-process
// side, implements this) and the renderer (src/, types window.api against
// this) can import it across the tsconfig.node/tsconfig.web boundary.
//
// Each domain starts as an empty placeholder and is filled in with real
// methods as its phase lands (P5 notes, P6 schedule, P7 budget, P9
// dashboard, P11 settings) — see workflow_daily-dashboard.md.

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

  accounts: Record<string, never>
  transactions: Record<string, never>
  categories: Record<string, never>
  budgets: Record<string, never>
  notes: Record<string, never>
  schedule: Record<string, never>
  settings: Record<string, never>
  dashboard: Record<string, never>
}
