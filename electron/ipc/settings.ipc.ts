import { app } from 'electron'
import type { SettingsRepository } from '../db/repositories/settings'
import { DEFAULT_LAUNCH_TIME, registerDailyLaunchTask } from '../scheduler/taskSchedulerBridge'
import { registerHandler } from './registerHandler'

export function registerSettingsHandlers(settings: SettingsRepository): void {
  registerHandler('settings:getLaunchTime', () => settings.get('launch_time') ?? DEFAULT_LAUNCH_TIME)

  registerHandler('settings:setLaunchTime', (launchTime: string) => {
    settings.set('launch_time', launchTime)

    // schtasks /Create /F replaces the existing "DailyDashboard" entry by
    // name — no duplicate task. Same dev-safety gate as onboarding
    // (auth.ipc.ts): npm run dev never touches the real Task Scheduler.
    if (app.isPackaged || process.env['FORCE_TASK_SCHEDULER_REGISTER']) {
      try {
        registerDailyLaunchTask(launchTime)
      } catch (error) {
        console.error('[scheduler] failed to update daily launch task:', error)
      }
    }
  })
}
