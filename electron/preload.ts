import { contextBridge } from 'electron'

// Phase 2 (IPC + security skeleton) fills this in with the real
// window.api surface defined in ARCHITECTURE.md §6. Left empty here
// so the renderer has something safe to import against in the meantime.
const api = {}

contextBridge.exposeInMainWorld('api', api)
