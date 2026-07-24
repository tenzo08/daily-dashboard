import { app } from 'electron'
import { existsSync, rmSync } from 'node:fs'
import type { DB } from '../db'
import type { SettingsRepository } from '../db/repositories/settings'
import { createAuthService } from '../lock/auth'
import { registerHandler } from './registerHandler'

export function registerAuthHandlers(db: DB, settings: SettingsRepository, dbFilePath: string): void {
  const auth = createAuthService(settings)

  registerHandler('auth:isPinSet', () => auth.isPinSet())
  registerHandler('auth:setPin', (pin: string) => auth.setPin(pin))
  registerHandler('auth:verifyPin', (pin: string) => auth.verifyPin(pin))

  // Wipe-on-reset (REQUIREMENTS.md OQ-1): no recovery mechanism, "forgot
  // PIN" deletes the local data file and restarts onboarding. Closing the
  // DB and relaunching the whole process is simpler and safer than trying
  // to reset every repository's in-memory prepared statements by hand.
  registerHandler('auth:resetData', () => {
    db.close()
    for (const suffix of ['', '-wal', '-shm']) {
      const file = dbFilePath + suffix
      if (existsSync(file)) rmSync(file)
    }
    app.relaunch()
    app.exit(0)
  })
}
