// Holds the derived AES key for the current unlocked session, in main-process
// memory only — never serialized, never sent over IPC. Cleared on lock and
// on quit; re-derived from the PIN + stored salt on the next successful
// unlock (electron/ipc/auth.ipc.ts).
let currentKey: Buffer | null = null

export const vaultSession = {
  get(): Buffer | null {
    return currentKey
  },
  set(key: Buffer): void {
    currentKey = key
  },
  clear(): void {
    currentKey = null
  }
}
