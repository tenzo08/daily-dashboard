import { app } from 'electron'
import { execFileSync } from 'node:child_process'
import { unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const TASK_NAME = 'DailyDashboard'
export const DEFAULT_LAUNCH_TIME = '07:30'

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function buildTaskXml(launchTime: string): string {
  const execPath = process.execPath
  // A packaged build's .exe is self-contained (ARCHITECTURE.md §5.3) — no
  // arguments needed. An unpackaged dev build's execPath is just
  // node_modules/electron/dist/electron.exe, which needs the app
  // directory as an argument or it launches with no app at all.
  const args = app.isPackaged ? '' : app.getAppPath()
  // Only the time-of-day matters for a daily-recurring trigger; the date
  // is just an anchor for the first occurrence.
  const startBoundary = `2024-01-01T${launchTime}:00`

  return `<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>Launches Daily Dashboard every day</Description>
  </RegistrationInfo>
  <Triggers>
    <CalendarTrigger>
      <StartBoundary>${startBoundary}</StartBoundary>
      <Enabled>true</Enabled>
      <ScheduleByDay>
        <DaysInterval>1</DaysInterval>
      </ScheduleByDay>
    </CalendarTrigger>
  </Triggers>
  <Principals>
    <Principal id="Author">
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>LeastPrivilege</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <AllowHardTerminate>true</AllowHardTerminate>
    <StartWhenAvailable>true</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
    <IdleSettings>
      <StopOnIdleEnd>false</StopOnIdleEnd>
      <RestartOnIdle>false</RestartOnIdle>
    </IdleSettings>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <Hidden>false</Hidden>
    <RunOnlyIfIdle>false</RunOnlyIfIdle>
    <WakeToRun>false</WakeToRun>
    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
    <Priority>7</Priority>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>${escapeXml(execPath)}</Command>
      ${args ? `<Arguments>${escapeXml(`"${args}"`)}</Arguments>` : ''}
    </Exec>
  </Actions>
</Task>`
}

/**
 * Registers (or replaces) the "DailyDashboard" Windows Task Scheduler
 * entry: a daily trigger at `launchTime` ('HH:MM', 24h) with
 * StartWhenAvailable so a missed run (PC off/asleep at the scheduled
 * time) fires as soon as Windows can — resolves REQUIREMENTS.md OQ-5.
 * This isn't reachable through schtasks' simple /Create flags for a daily
 * trigger; it requires the full XML task definition (ARCHITECTURE.md §5.3).
 */
export function registerDailyLaunchTask(launchTime: string): void {
  const xml = buildTaskXml(launchTime)
  const tmpFile = join(tmpdir(), `daily-dashboard-task-${Date.now()}.xml`)
  // schtasks /XML expects UTF-16LE with a BOM, matching what Windows' own
  // "Export Task..." produces — plain UTF-8 XML is rejected outright.
  const bom = Buffer.from([0xff, 0xfe])
  writeFileSync(tmpFile, Buffer.concat([bom, Buffer.from(xml, 'utf16le')]))
  try {
    execFileSync('schtasks', ['/Create', '/TN', TASK_NAME, '/XML', tmpFile, '/F'], { windowsHide: true })
  } finally {
    unlinkSync(tmpFile)
  }
}

export function unregisterDailyLaunchTask(): void {
  try {
    execFileSync('schtasks', ['/Delete', '/TN', TASK_NAME, '/F'], { windowsHide: true })
  } catch {
    // Task doesn't exist — nothing to remove.
  }
}
