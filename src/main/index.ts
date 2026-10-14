import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { registerIpc } from './ipc'
import { ensureBinaries } from './services/binaries'
import { flushHistory, initHistory } from './services/history'
import { killAll } from './services/queue'
import { flushSettings, getSettings, initSettings } from './services/settings'
import { windowColors } from '@shared/themes'

let win: BrowserWindow | null = null

const APP_ID = 'com.streampull.app'

// Window/taskbar icon. Packaged builds ship it in <resources>/ (see `extraResources`); in dev it
// lives in the project's resources folder. Windows prefers the multi-size .ico for the taskbar.
const iconFile = process.platform === 'win32' ? 'icon.ico' : 'icon.png'
const iconPath = (): string =>
  app.isPackaged ? join(process.resourcesPath, iconFile) : join(app.getAppPath(), 'resources', iconFile)

// Dev/testing aid: lets an external script drive the renderer over CDP.
if (process.env['VG_DEBUG_PORT']) app.commandLine.appendSwitch('remote-debugging-port', process.env['VG_DEBUG_PORT'])

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

  app.whenReady().then(() => {
    app.setAppUserModelId(APP_ID)
    initSettings()
    initHistory()
    registerIpc(() => win)
    createWindow()
    void ensureBinaries()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('before-quit', () => {
    killAll()
    flushSettings()
    flushHistory()
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}

function createWindow(): void {
  const colors = windowColors(getSettings().theme)
  win = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 900,
    minHeight: 620,
    show: false,
    backgroundColor: colors.color,
    title: 'StreamPull',
    icon: iconPath(),
    // Custom title bar: native traffic lights on macOS, a themed controls overlay on Windows/Linux.
    ...(process.platform === 'darwin'
      ? { titleBarStyle: 'hiddenInset' as const, trafficLightPosition: { x: 16, y: 14 } }
      : {
          titleBarStyle: 'hidden' as const,
          titleBarOverlay: { color: colors.color, symbolColor: colors.symbolColor, height: 44 }
        }),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  // Windows: pin the taskbar button's icon explicitly. With a custom AppUserModelId and no registered
  // shortcut, Windows otherwise falls back to the executable's own icon (Electron's atom in dev).
  if (process.platform === 'win32') {
    const exe = `"${process.execPath}"`
    win.setAppDetails({
      appId: APP_ID,
      appIconPath: iconPath(),
      appIconIndex: 0,
      relaunchCommand: app.isPackaged ? exe : `${exe} "${app.getAppPath()}"`,
      relaunchDisplayName: 'StreamPull'
    })
  }

  win.once('ready-to-show', () => win?.show())
  win.on('closed', () => (win = null))

  // Never navigate away from the app or open new Electron windows.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('http://localhost') && !url.startsWith('file://')) e.preventDefault()
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    void win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}
