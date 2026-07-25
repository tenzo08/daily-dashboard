import { app, Menu, nativeImage, Tray, type BrowserWindow } from 'electron'
import { join } from 'path'
import type { DB } from '../db'
import { createActivityLogRepository } from '../db/repositories/activityLog'
import { createNotesRepository } from '../db/repositories/notes'
import { createTasksRepository } from '../db/repositories/tasks'
import { is } from '../lib/env'
import { vaultSession } from '../lock/vaultSession'

export function createTray(mainWindow: BrowserWindow, db: DB): Tray {
  // Packaged builds need resources/ copied in via electron-builder's
  // extraResources config (Phase 12) — process.resourcesPath is where
  // that lands. Unpackaged dev just reads the source tree directly.
  const iconPath = is.dev
    ? join(__dirname, '../../resources/tray-icon.png')
    : join(process.resourcesPath, 'tray-icon.png')

  const icon = nativeImage.createFromPath(iconPath)
  if (icon.isEmpty()) {
    console.warn('[tray] icon failed to load from', iconPath)
  }

  const tray = new Tray(icon)
  tray.setToolTip('Daily Dashboard')

  const notes = createNotesRepository(db)
  const tasks = createTasksRepository(db)
  const activity = createActivityLogRepository(db)

  const showWindow = (): void => {
    mainWindow.show()
    mainWindow.focus()
  }

  // Quick-capture is blocked while locked — vaultSession only holds a key
  // after a real PIN unlock (electron/ipc/auth.ipc.ts), so this is the same
  // signal the rest of the app uses to know it's unlocked. Locked just
  // shows the window (the lock screen) instead of silently writing data
  // behind the PIN gate.
  function quickCreateTask(): void {
    if (!vaultSession.get()) {
      showWindow()
      return
    }
    const task = tasks.create({ title: 'New task' })
    activity.log('task.created', `Added task — ${task.title}`)
    showWindow()
    mainWindow.webContents.send('tray:quickAction', { type: 'task', id: task.id })
  }

  function quickCreateNote(): void {
    if (!vaultSession.get()) {
      showWindow()
      return
    }
    const note = notes.create({ title: 'Untitled' })
    activity.log('note.created', `Created note — ${note.title}`)
    showWindow()
    mainWindow.webContents.send('tray:quickAction', { type: 'note', id: note.id })
  }

  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open', click: showWindow },
      { type: 'separator' },
      { label: 'New Task', click: quickCreateTask },
      { label: 'New Note', click: quickCreateNote },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() }
    ])
  )

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      showWindow()
    }
  })

  return tray
}
