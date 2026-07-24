import { app } from 'electron'
import { existsSync, rmSync } from 'node:fs'
import type { DB } from '../db'
import type { SettingsRepository } from '../db/repositories/settings'
import { createAuthService } from '../lock/auth'
import { DEFAULT_LAUNCH_TIME, registerDailyLaunchTask } from '../scheduler/taskSchedulerBridge'
import { registerHandler } from './registerHandler'

export function registerAuthHandlers(db: DB, settings: SettingsRepository, dbFilePath: string): void {
  const auth = createAuthService(settings)

  registerHandler('auth:isPinSet', () => auth.isPinSet())
  registerHandler('auth:setPin', (pin: string) => {
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
