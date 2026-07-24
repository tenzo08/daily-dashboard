import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from './lib/env'
import { openDatabase } from './db'
import { createSettingsRepository } from './db/repositories/settings'
import { registerAuthHandlers } from './ipc/auth.ipc'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
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

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev) {
    // Forwards renderer console.log/warn/error into main's stdout. Cheap,
    // dev-only, and the only practical way to observe renderer-side state
    // when verifying a phase's checkpoint without a way to screenshot the
    // window.
    mainWindow.webContents.on('console-message', (details) => {
      console.log('[renderer]', details.message)
    })
  }

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    const dbFilePath = join(app.getPath('userData'), 'data.db')
    const db = openDatabase(dbFilePath)
    const settings = createSettingsRepository(db)
    registerAuthHandlers(db, settings, dbFilePath)
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
