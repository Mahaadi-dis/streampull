import { BrowserWindow, clipboard, dialog, ipcMain, shell } from 'electron'
import { existsSync, mkdirSync } from 'fs'
import type { DownloadRequest, Settings } from '@shared/types'
import {
  back,
  forward,
  getNavState,
  home,
  initBrowser,
  listSniffed,
  navigate,
  reload,
  resetSniffed,
  setBounds,
  stop
} from './services/browser'
import { getBinaryState, onBinaryState, updateYtdlp } from './services/binaries'
import { clearHistory, getHistory, listHistory, removeHistory } from './services/history'
import {
  addToQueue,
  bindQueue,
  cancel,
  clearFinished,
  listQueue,
  pause,
  removeFromQueue,
  repump,
  resume,
  retry
} from './services/queue'
import { getSettings, updateSettings } from './services/settings'
import { analyze } from './services/ytdlp'
import { isValidUrl } from './services/ytdlpArgs'

const str = (v: unknown): string => (typeof v === 'string' ? v : '')

function sanitizeRequest(r: unknown): DownloadRequest | null {
  const o = r as Partial<DownloadRequest> | null
  if (!o || !isValidUrl(str(o.url))) return null
  return {
    url: str(o.url),
    title: str(o.title).slice(0, 300) || str(o.url),
    thumbnail: typeof o.thumbnail === 'string' ? o.thumbnail : null,
    duration: typeof o.duration === 'number' ? o.duration : null,
    uploader: typeof o.uploader === 'string' ? o.uploader : null,
    quality: str(o.quality) || 'best',
    expectedBytes: typeof o.expectedBytes === 'number' && o.expectedBytes > 0 ? o.expectedBytes : null,
    referer: isValidUrl(str(o.referer)) ? str(o.referer) : null,
    cookieUrl: isValidUrl(str(o.cookieUrl)) ? str(o.cookieUrl) : null,
    fileName: str(o.fileName).slice(0, 200) || null
  }
}

function filePathFor(id: string): string | undefined {
  return getHistory(id)?.filePath ?? listQueue().find((i) => i.id === id)?.filePath
}

export function registerIpc(getWin: () => BrowserWindow | null): void {
  const send = (channel: string, payload: unknown): void => {
    const w = getWin()
    if (w && !w.isDestroyed()) w.webContents.send(channel, payload)
  }

  onBinaryState((s) => send('binaries:state', s))
  initBrowser(getWin, send)
  bindQueue(
    (item) => send('queue:update', item),
    (id) => send('queue:removed', id)
  )

  ipcMain.handle('binaries:state', () => getBinaryState())
  ipcMain.handle('binaries:update', () => updateYtdlp())

  ipcMain.handle('settings:get', () => getSettings())
  ipcMain.handle('settings:set', (_e, patch: Partial<Settings>) => {
    const s = updateSettings(patch ?? {})
    repump()
    return s
  })
  ipcMain.handle('dialog:folder', async () => {
    const w = getWin()
    const opts = { properties: ['openDirectory', 'createDirectory'] as ('openDirectory' | 'createDirectory')[] }
    const r = w ? await dialog.showOpenDialog(w, opts) : await dialog.showOpenDialog(opts)
    return r.canceled ? null : r.filePaths[0]
  })
  ipcMain.handle('clipboard:read', async () => (await clipboard.readText()).trim().slice(0, 2000))

  ipcMain.handle('media:analyze', (_e, url: unknown, cookieUrl: unknown) =>
    analyze(str(url).trim(), isValidUrl(str(cookieUrl)) ? str(cookieUrl) : null)
  )

  ipcMain.handle('queue:list', () => listQueue())
  ipcMain.handle('queue:add', (_e, reqs: unknown) => {
    const list = (Array.isArray(reqs) ? reqs : []).map(sanitizeRequest).filter((r): r is DownloadRequest => !!r)
    return addToQueue(list.slice(0, 500))
  })
  ipcMain.handle('queue:pause', (_e, id: unknown) => pause(str(id)))
  ipcMain.handle('queue:resume', (_e, id: unknown) => resume(str(id)))
  ipcMain.handle('queue:cancel', (_e, id: unknown) => cancel(str(id)))
  ipcMain.handle('queue:retry', (_e, id: unknown) => retry(str(id)))
  ipcMain.handle('queue:remove', (_e, id: unknown) => removeFromQueue(str(id)))
  ipcMain.handle('queue:clearFinished', () => clearFinished())

  ipcMain.handle('history:list', () => listHistory())
  ipcMain.handle('history:remove', (_e, id: unknown, del: unknown) => removeHistory(str(id), del === true))
  ipcMain.handle('history:clear', () => clearHistory())

  ipcMain.handle('shell:openFile', async (_e, id: unknown) => {
    const p = filePathFor(str(id))
    if (!p || !existsSync(p)) return false
    return (await shell.openPath(p)) === ''
  })
  ipcMain.handle('shell:showInFolder', (_e, id: unknown) => {
    const p = filePathFor(str(id))
    if (p && existsSync(p)) shell.showItemInFolder(p)
    else void shell.openPath(getSettings().downloadDir)
  })
  ipcMain.handle('shell:openDownloadDir', () => {
    const d = getSettings().downloadDir
    mkdirSync(d, { recursive: true })
    return shell.openPath(d).then(() => undefined)
  })
  ipcMain.handle('shell:openExternal', (_e, url: unknown) => {
    const u = str(url)
    if (isValidUrl(u)) return shell.openExternal(u)
  })

  // Embedded browser
  ipcMain.handle('browser:bounds', (_e, b: unknown) => {
    const r = b as { x?: unknown; y?: unknown; width?: unknown; height?: unknown } | null
    if (r && [r.x, r.y, r.width, r.height].every((n) => typeof n === 'number' && Number.isFinite(n))) {
      setBounds(r as { x: number; y: number; width: number; height: number })
    } else setBounds(null)
  })
  ipcMain.handle('browser:navigate', (_e, input: unknown) => navigate(str(input).slice(0, 2000)))
  ipcMain.handle('browser:back', () => back())
  ipcMain.handle('browser:forward', () => forward())
  ipcMain.handle('browser:reload', () => reload())
  ipcMain.handle('browser:stop', () => stop())
  ipcMain.handle('browser:home', () => home())
  ipcMain.handle('browser:state', () => getNavState())
  ipcMain.handle('browser:sniffed', () => listSniffed())
  ipcMain.handle('browser:clearSniffed', () => resetSniffed())
}
