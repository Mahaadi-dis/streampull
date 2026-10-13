import { contextBridge, ipcRenderer } from 'electron'
import type { Api } from '@shared/api'

const invoke = <T>(channel: string, ...args: unknown[]): Promise<T> => ipcRenderer.invoke(channel, ...args)

const on = <T>(channel: string, cb: (v: T) => void): (() => void) => {
  const handler = (_e: unknown, v: T): void => cb(v)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

const api: Api = {
  getBinaryState: () => invoke('binaries:state'),
  updateYtdlp: () => invoke('binaries:update'),
  onBinaryState: (cb) => on('binaries:state', cb),

  getSettings: () => invoke('settings:get'),
  setSettings: (patch) => invoke('settings:set', patch),
  chooseFolder: () => invoke('dialog:folder'),
  readClipboard: () => invoke('clipboard:read'),

  analyze: (url, cookieUrl) => invoke('media:analyze', url, cookieUrl ?? null),

  listQueue: () => invoke('queue:list'),
  addToQueue: (reqs) => invoke('queue:add', reqs),
  pause: (id) => invoke('queue:pause', id),
  resume: (id) => invoke('queue:resume', id),
  cancel: (id) => invoke('queue:cancel', id),
  retry: (id) => invoke('queue:retry', id),
  removeFromQueue: (id) => invoke('queue:remove', id),
  clearFinished: () => invoke('queue:clearFinished'),
  onQueueUpdate: (cb) => on('queue:update', cb),
  onQueueRemove: (cb) => on('queue:removed', cb),

  listHistory: () => invoke('history:list'),
  removeHistory: (id, deleteFile) => invoke('history:remove', id, deleteFile),
  clearHistory: () => invoke('history:clear'),

  openFile: (id) => invoke('shell:openFile', id),
  showInFolder: (id) => invoke('shell:showInFolder', id),
  openDownloadDir: () => invoke('shell:openDownloadDir'),
  openExternal: (url) => invoke('shell:openExternal', url),

  browserSetBounds: (b) => invoke('browser:bounds', b),
  browserNavigate: (input) => invoke('browser:navigate', input),
  browserBack: () => invoke('browser:back'),
  browserForward: () => invoke('browser:forward'),
  browserReload: () => invoke('browser:reload'),
  browserStop: () => invoke('browser:stop'),
  browserHome: () => invoke('browser:home'),
  browserState: () => invoke('browser:state'),
  listSniffed: () => invoke('browser:sniffed'),
  clearSniffed: () => invoke('browser:clearSniffed'),
  onBrowserNav: (cb) => on('browser:nav', cb),
  onSniffed: (cb) => on('browser:sniff', cb),
  onSniffCleared: (cb) => on('browser:sniffCleared', () => cb())
}

contextBridge.exposeInMainWorld('api', api)
