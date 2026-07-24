import { app } from 'electron'
import type { ActivityLogRepository } from '../db/repositories/activityLog'
import type { SettingsRepository } from '../db/repositories/settings'
import { DEFAULT_LAUNCH_TIME, registerDailyLaunchTask } from '../scheduler/taskSchedulerBridge'
import { registerHandler } from './registerHandler'

export const DEFAULT_IDLE_LOCK_MINUTES = 10
export const DEFAULT_ACTIVITY_RETENTION_DAYS = 90

export function registerSettingsHandlers(settings: SettingsRepository, activity: ActivityLogRepository): void {
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

  // 0 = disabled (never auto-lock).
  registerHandler('settings:getIdleLockMinutes', () =>
    Number(settings.get('idle_lock_minutes') ?? DEFAULT_IDLE_LOCK_MINUTES)
  )
  registerHandler('settings:setIdleLockMinutes', (minutes: number) => {
    settings.set('idle_lock_minutes', String(Math.max(0, Math.floor(minutes))))
  })

  // 0 = keep forever.
  registerHandler('settings:getActivityRetentionDays', () =>
    Number(settings.get('activity_retention_days') ?? DEFAULT_ACTIVITY_RETENTION_DAYS)
  )
  registerHandler('settings:setActivityRetentionDays', (days: number) => {
    const clamped = Math.max(0, Math.floor(days))
    settings.set('activity_retention_days', String(clamped))
    activity.pruneOlderThan(clamped)
  })
}
