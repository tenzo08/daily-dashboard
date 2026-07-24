import { app, Menu, nativeImage, Tray, type BrowserWindow } from 'electron'
import { join } from 'path'
import { is } from '../lib/env'

export function createTray(mainWindow: BrowserWindow): Tray {
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

  const showWindow = (): void => {
    mainWindow.show()
    mainWindow.focus()
  }

  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open', click: showWindow },
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
