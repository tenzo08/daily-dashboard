import { contextBridge, ipcRenderer } from 'electron'
import type { ApiContract, TrayQuickAction } from './ipc/contract'

const api: ApiContract = {
  auth: {
    isPinSet: () => ipcRenderer.invoke('auth:isPinSet'),
    setPin: (pin) => ipcRenderer.invoke('auth:setPin', pin),
    verifyPin: (pin) => ipcRenderer.invoke('auth:verifyPin', pin),
    resetData: () => ipcRenderer.invoke('auth:resetData'),
    lock: () => ipcRenderer.invoke('auth:lock')
  },

  notes: {
    listFolders: () => ipcRenderer.invoke('notes:listFolders'),
    createFolder: (name, parentId) => ipcRenderer.invoke('notes:createFolder', name, parentId),
    listNotes: (filter) => ipcRenderer.invoke('notes:listNotes', filter),
    getNote: (id) => ipcRenderer.invoke('notes:getNote', id),
    createNote: (input) => ipcRenderer.invoke('notes:createNote', input),
    saveNote: (id, patch) => ipcRenderer.invoke('notes:saveNote', id, patch),
    getOrCreateDailyNote: () => ipcRenderer.invoke('notes:getOrCreateDailyNote'),
    listTags: () => ipcRenderer.invoke('notes:listTags'),
    tagsForNote: (noteId) => ipcRenderer.invoke('notes:tagsForNote', noteId),
    addTagToNote: (noteId, tagName) => ipcRenderer.invoke('notes:addTagToNote', noteId, tagName),
    removeTagFromNote: (noteId, tagId) => ipcRenderer.invoke('notes:removeTagFromNote', noteId, tagId)
  },

  schedule: {
    listOccurrences: (rangeStartISO, rangeEndISO) =>
      ipcRenderer.invoke('schedule:listOccurrences', rangeStartISO, rangeEndISO),
    listItems: () => ipcRenderer.invoke('schedule:listItems'),
    getItem: (id) => ipcRenderer.invoke('schedule:getItem', id),
    createItem: (input) => ipcRenderer.invoke('schedule:createItem', input),
    updateItem: (id, patch) => ipcRenderer.invoke('schedule:updateItem', id, patch),
    deleteItem: (id) => ipcRenderer.invoke('schedule:deleteItem', id),
    toggleCompletion: (itemId, occurrenceDate) =>
      ipcRenderer.invoke('schedule:toggleCompletion', itemId, occurrenceDate)
  },

  accounts: {
    list: (includeArchived) => ipcRenderer.invoke('accounts:list', includeArchived),
    create: (input) => ipcRenderer.invoke('accounts:create', input),
    update: (id, patch) => ipcRenderer.invoke('accounts:update', id, patch),
    archive: (id) => ipcRenderer.invoke('accounts:archive', id),
    getBalances: () => ipcRenderer.invoke('accounts:getBalances')
  },

  transactions: {
    list: (filter) => ipcRenderer.invoke('transactions:list', filter),
    create: (input) => ipcRenderer.invoke('transactions:create', input),
    update: (id, patch) => ipcRenderer.invoke('transactions:update', id, patch),
    delete: (id) => ipcRenderer.invoke('transactions:delete', id)
  },

  categories: {
    list: () => ipcRenderer.invoke('categories:list'),
    create: (input) => ipcRenderer.invoke('categories:create', input)
  },

  budgets: {
    list: () => ipcRenderer.invoke('budgets:list'),
    set: (categoryId, limitAmount, thresholdPct) =>
      ipcRenderer.invoke('budgets:set', categoryId, limitAmount, thresholdPct)
  },

  credentials: {
    list: () => ipcRenderer.invoke('credentials:list'),
    create: (input) => ipcRenderer.invoke('credentials:create', input),
    update: (id, patch) => ipcRenderer.invoke('credentials:update', id, patch),
    delete: (id) => ipcRenderer.invoke('credentials:delete', id),
    reveal: (id) => ipcRenderer.invoke('credentials:reveal', id),
    health: () => ipcRenderer.invoke('credentials:health')
  },

  tasks: {
    list: (filter) => ipcRenderer.invoke('tasks:list', filter),
    create: (input) => ipcRenderer.invoke('tasks:create', input),
    update: (id, patch) => ipcRenderer.invoke('tasks:update', id, patch),
    setStatus: (id, status) => ipcRenderer.invoke('tasks:setStatus', id, status),
    delete: (id) => ipcRenderer.invoke('tasks:delete', id)
  },

  activity: {
    list: (limit) => ipcRenderer.invoke('activity:list', limit)
  },

  system: {
    copyToClipboard: (text) => ipcRenderer.invoke('system:copyToClipboard', text)
  },

  dashboard: {
    getToday: () => ipcRenderer.invoke('dashboard:getToday')
  },

  settings: {
    getLaunchTime: () => ipcRenderer.invoke('settings:getLaunchTime'),
    setLaunchTime: (time) => ipcRenderer.invoke('settings:setLaunchTime', time),
    getIdleLockMinutes: () => ipcRenderer.invoke('settings:getIdleLockMinutes'),
    setIdleLockMinutes: (minutes) => ipcRenderer.invoke('settings:setIdleLockMinutes', minutes),
    getActivityRetentionDays: () => ipcRenderer.invoke('settings:getActivityRetentionDays'),
    setActivityRetentionDays: (days) => ipcRenderer.invoke('settings:setActivityRetentionDays', days)
  },

  backup: {
    export: () => ipcRenderer.invoke('backup:export'),
    import: () => ipcRenderer.invoke('backup:import'),
    exportTransactionsCsv: () => ipcRenderer.invoke('backup:exportTransactionsCsv')
  },

  tray: {
    onQuickAction: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, action: TrayQuickAction): void => callback(action)
      ipcRenderer.on('tray:quickAction', listener)
      return () => ipcRenderer.removeListener('tray:quickAction', listener)
    }
  }
}

contextBridge.exposeInMainWorld('api', api)
