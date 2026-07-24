import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from './lib/env'
import { openDatabase, type DB } from './db'
import { registerHandler } from './ipc/registerHandler'

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

function registerIpcHandlers(db: DB): void {
  // Phase 2 smoke test only — proves preload/contextBridge/ipcMain wiring
  // AND the real DB connection work end to end. Delete once a real handler
  // (Phase 3's auth.verifyPin) exercises the same path. See
  // electron/ipc/contract.ts.
  registerHandler('ping', () => {
    const { n } = db.prepare('SELECT COUNT(*) AS n FROM _migrations').get() as { n: number }
    console.log(`[ipc] ping received (migrations applied: ${n})`)
    return 'pong'
  })
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
    const db = openDatabase(join(app.getPath('userData'), 'data.db'))
    registerIpcHandlers(db)
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
