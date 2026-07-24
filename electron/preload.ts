import { contextBridge, ipcRenderer } from 'electron'
import type { ApiContract } from './ipc/contract'

const api: ApiContract = {
  auth: {
    isPinSet: () => ipcRenderer.invoke('auth:isPinSet'),
    setPin: (pin) => ipcRenderer.invoke('auth:setPin', pin),
    verifyPin: (pin) => ipcRenderer.invoke('auth:verifyPin', pin),
    resetData: () => ipcRenderer.invoke('auth:resetData')
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

  // Filled in as each phase lands (see ApiContract in ipc/contract.ts).
  accounts: {},
  transactions: {},
  categories: {},
  budgets: {},
  schedule: {},
  settings: {},
  dashboard: {}
}

contextBridge.exposeInMainWorld('api', api)
