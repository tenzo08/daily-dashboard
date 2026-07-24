import { contextBridge, ipcRenderer } from 'electron'
import type { ApiContract } from './ipc/contract'

const api: ApiContract = {
  ping: () => ipcRenderer.invoke('ping'),

  // Filled in as each phase lands (see ApiContract in ipc/contract.ts).
  auth: {},
  accounts: {},
  transactions: {},
  categories: {},
  budgets: {},
  notes: {},
  schedule: {},
  settings: {},
  dashboard: {}
}

contextBridge.exposeInMainWorld('api', api)
