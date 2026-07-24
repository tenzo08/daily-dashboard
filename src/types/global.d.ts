import type { ApiContract } from '../../electron/ipc/contract'

declare global {
  interface Window {
    api: ApiContract
  }
}

export {}
