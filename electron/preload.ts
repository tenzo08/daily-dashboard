import { contextBridge, ipcRenderer } from 'electron'
import type { ApiContract } from './ipc/contract'

const api: ApiContract = {
  auth: {
    isPinSet: () => ipcRenderer.invoke('auth:isPinSet'),
    setPin: (pin) => ipcRenderer.invoke('auth:setPin', pin),
    verifyPin: (pin) => ipcRenderer.invoke('auth:verifyPin', pin),
    resetData: () => ipcRenderer.invoke('auth:resetData')
  },

  // Filled in as each phase lands (see ApiContract in ipc/contract.ts).
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
