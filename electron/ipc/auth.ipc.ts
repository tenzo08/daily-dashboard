import { app } from 'electron'
import { existsSync, rmSync } from 'node:fs'
import type { DB } from '../db'
import type { CredentialsRepository } from '../db/repositories/credentials'
import type { SettingsRepository } from '../db/repositories/settings'
import { createAuthService } from '../lock/auth'
import { decryptSecret, deriveVaultKey, encryptSecret, generateVaultSalt } from '../lock/vaultCrypto'
import { vaultSession } from '../lock/vaultSession'
import { DEFAULT_LAUNCH_TIME, registerDailyLaunchTask } from '../scheduler/taskSchedulerBridge'
import { registerHandler } from './registerHandler'

const VAULT_SALT_KEY = 'vault_kdf_salt'

export function registerAuthHandlers(
  db: DB,
  settings: SettingsRepository,
  dbFilePath: string,
  credentials: CredentialsRepository
): void {
  const auth = createAuthService(settings)

  registerHandler('auth:isPinSet', () => auth.isPinSet())

  registerHandler('auth:setPin', async (pin: string) => {
    const existingSalt = settings.get(VAULT_SALT_KEY)

    if (existingSalt) {
      // PIN change: the caller must have just verified the *current* PIN
      // (see SettingsScreen.tsx), which leaves its derived key cached here —
      // that's the old key we need to re-encrypt every credential with the
      // new one. Without it we can't decrypt anything to re-key it.
      const oldKey = vaultSession.get()
      if (!oldKey) {
        throw new Error('Vault must be unlocked (current PIN verified) before changing the PIN')
      }
      const newKey = await deriveVaultKey(pin, existingSalt)
      for (const row of credentials.listAll()) {
        const plaintext = decryptSecret(row, oldKey)
        credentials.rekeySecret(row.id, encryptSecret(plaintext, newKey))
      }
      vaultSession.set(newKey)
    } else {
      // First-time setup: nothing to re-encrypt yet.
      const salt = generateVaultSalt()
      settings.set(VAULT_SALT_KEY, salt)
      vaultSession.set(await deriveVaultKey(pin, salt))
    }

    auth.setPin(pin)

    // Register the daily auto-launch once onboarding completes
    // (ARCHITECTURE.md §5.3). Gated behind isPackaged (plus a dev-only
    // override for testing) so `npm run dev` never touches the real
    // Windows Task Scheduler on a developer's machine.
    if (app.isPackaged || process.env['FORCE_TASK_SCHEDULER_REGISTER']) {
      const launchTime = settings.get('launch_time') ?? DEFAULT_LAUNCH_TIME
      settings.set('launch_time', launchTime)
      try {
        registerDailyLaunchTask(launchTime)
      } catch (error) {
        console.error('[scheduler] failed to register daily launch task:', error)
      }
    }
  })

  registerHandler('auth:verifyPin', async (pin: string) => {
    const result = auth.verifyPin(pin)
    if (result.ok) {
      // Salt always exists once a PIN has been set (auth:setPin creates it
      // on first run) — the generate-and-persist branch only matters for a
      // DB created before the vault feature existed.
      let salt = settings.get(VAULT_SALT_KEY)
      if (!salt) {
        salt = generateVaultSalt()
        settings.set(VAULT_SALT_KEY, salt)
      }
      vaultSession.set(await deriveVaultKey(pin, salt))
    }
    return result
  })

  // Re-locking (sidebar "Lock" action) drops the in-memory vault key without
  // touching the window — the renderer separately swaps back to LockScreen.
  registerHandler('auth:lock', () => {
    vaultSession.clear()
  })

  // Wipe-on-reset (REQUIREMENTS.md OQ-1): no recovery mechanism, "forgot
  // PIN" deletes the local data file and restarts onboarding. Closing the
  // DB and relaunching the whole process is simpler and safer than trying
  // to reset every repository's in-memory prepared statements by hand.
  registerHandler('auth:resetData', () => {
    vaultSession.clear()
    db.close()
    for (const suffix of ['', '-wal', '-shm']) {
      const file = dbFilePath + suffix
      if (existsSync(file)) rmSync(file)
    }
    app.relaunch()
    app.exit(0)
  })
}
