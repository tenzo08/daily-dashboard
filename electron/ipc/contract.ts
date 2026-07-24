// Shape of window.api (ARCHITECTURE.md §6). Pure types only — no
// 'electron' or Node-specific imports — so both preload.ts (main-process
// side, implements this) and the renderer (src/, types window.api against
// this) can import it across the tsconfig.node/tsconfig.web boundary.
//
// Each domain starts as an empty placeholder and is filled in with real
// methods as its phase lands (P3 auth, P5 notes, P6 schedule, P7 budget,
// P9 dashboard, P11 settings) — see workflow_daily-dashboard.md.

export interface ApiContract {
  /** Phase 2 smoke test only — proves the IPC round trip. Removed once a
   *  real handler (e.g. auth.verifyPin in Phase 3) exercises the same
   *  preload/contextBridge/ipcMain wiring. */
  ping: () => Promise<string>

  auth: Record<string, never>
  accounts: Record<string, never>
  transactions: Record<string, never>
  categories: Record<string, never>
  budgets: Record<string, never>
  notes: Record<string, never>
  schedule: Record<string, never>
  settings: Record<string, never>
  dashboard: Record<string, never>
}
