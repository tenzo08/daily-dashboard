import { app, BrowserWindow, shell, type Tray } from 'electron'
import { join } from 'path'
import { is } from './lib/env'
import { openDatabase } from './db'
import { createSettingsRepository } from './db/repositories/settings'
import { registerAuthHandlers } from './ipc/auth.ipc'
import { createTray } from './tray/tray'

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
    registerAuthHandlers(db, settings, dbFilePath)

    const window = createWindow()
    tray = createTray(window)

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
