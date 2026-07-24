import { app, BrowserWindow, shell, type Tray } from 'electron'
import { join } from 'path'
import { is } from './lib/env'
import { openDatabase } from './db'
import { createActivityLogRepository } from './db/repositories/activityLog'
import { createCredentialsRepository } from './db/repositories/credentials'
import { createSettingsRepository } from './db/repositories/settings'
import { registerAuthHandlers } from './ipc/auth.ipc'
import { registerNotesHandlers } from './ipc/notes.ipc'
import { registerScheduleHandlers } from './ipc/schedule.ipc'
import { registerAccountsHandlers } from './ipc/accounts.ipc'
import { registerCategoriesHandlers } from './ipc/categories.ipc'
import { registerTransactionsHandlers } from './ipc/transactions.ipc'
import { registerBudgetsHandlers } from './ipc/budgets.ipc'
import { registerCredentialsHandlers } from './ipc/credentials.ipc'
import { registerTasksHandlers } from './ipc/tasks.ipc'
import { registerActivityHandlers } from './ipc/activity.ipc'
import { registerBackupHandlers } from './ipc/backup.ipc'
import { registerSystemHandlers } from './ipc/system.ipc'
import { registerDashboardHandlers } from './ipc/dashboard.ipc'
import { DEFAULT_ACTIVITY_RETENTION_DAYS, registerSettingsHandlers } from './ipc/settings.ipc'
import { createTray } from './tray/tray'
import { startReminderLoop } from './scheduler/reminderLoop'

let mainWindow: BrowserWindow | null = null
// Electron GCs the Tray (icon vanishes) if nothing references it — this
// keeps it alive for the app's lifetime.
let tray: Tray | null = null
// Set by 'before-quit', which fires before any window's 'close' event —
// distinguishes "closed the window" (hide to tray) from "actually quitting"
// (tray's Quit item, OS shutdown). See ARCHITECTURE.md §5.1.
let isQuitting = false

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1100,
    height: 750,
    show: false,
    autoHideMenuBar: true,
    // Packaged builds get their icon baked into the .exe via
    // electron-builder's win.icon; dev mode needs it set explicitly or the
    // window shows Electron's default icon.
    ...(is.dev ? { icon: join(__dirname, '../../resources/app-icon/icon.ico') } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })
  mainWindow = window

  window.on('ready-to-show', () => {
    window.show()
  })

  window.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      window.hide()
    }
  })

  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev) {
    // Forwards renderer console.log/warn/error into main's stdout. Cheap,
    // dev-only, and the only practical way to observe renderer-side state
    // when verifying a phase's checkpoint without a way to screenshot the
    // window.
    window.webContents.on('console-message', (details) => {
      console.log('[renderer]', details.message)
    })
  }

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return window
}

const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    console.log('[main] second-instance: focusing existing window')
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })

  app.on('before-quit', () => {
    isQuitting = true
    tray?.destroy()
  })

  app.whenReady().then(() => {
    const dbFilePath = join(app.getPath('userData'), 'data.db')
    const db = openDatabase(dbFilePath)
    const settings = createSettingsRepository(db)
    const credentials = createCredentialsRepository(db)
    const activity = createActivityLogRepository(db)
    registerAuthHandlers(db, settings, dbFilePath, credentials)
    registerNotesHandlers(db)
    registerScheduleHandlers(db)
    registerAccountsHandlers(db)
    registerCategoriesHandlers(db)
    registerTransactionsHandlers(db)
    registerBudgetsHandlers(db)
    registerCredentialsHandlers(db)
    registerTasksHandlers(db)
    registerActivityHandlers(db)
    registerBackupHandlers(db)
    registerSystemHandlers()
    registerDashboardHandlers(db)
    registerSettingsHandlers(settings, activity)

    // Prune on every startup, not just when the setting changes — covers
    // the common case where retention was already configured before this
    // launch and entries have piled up since.
    const retentionDays = Number(settings.get('activity_retention_days') ?? DEFAULT_ACTIVITY_RETENTION_DAYS)
    activity.pruneOlderThan(retentionDays)

    const window = createWindow()
    tray = createTray(window)
    // getWindow() closes over the outer `mainWindow`, not this snapshot,
    // so it stays correct if the window is ever recreated via 'activate'.
    startReminderLoop(db, () => mainWindow)

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
