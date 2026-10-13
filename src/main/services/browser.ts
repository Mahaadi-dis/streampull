import { app, BrowserWindow, session, WebContentsView, type Session } from 'electron'
import { randomBytes } from 'crypto'
import { rm, writeFile } from 'fs/promises'
import { join } from 'path'
import type { BrowserBounds, BrowserNav, SniffItem } from '@shared/types'
import { classifyResponse } from './sniffRules'
import { isValidUrl } from './ytdlpArgs'

const PARTITION = 'persist:vg-browser'
const MAX_SNIFFED = 60

type Send = (channel: string, payload?: unknown) => void

let getWin: () => BrowserWindow | null = () => null
let send: Send = () => undefined
let view: WebContentsView | null = null
let visible = false
let counter = 0
let sniffed: SniffItem[] = []

const ses = (): Session => session.fromPartition(PARTITION)

/** The embedded browser should look like a normal Chrome, not "Electron". */
export const browserUserAgent = (): string =>
  app.userAgentFallback.replace(/\s(Electron|streampull|StreamPull)\/\S+/gi, '')

const blank = (u: string): boolean => !u || u === 'about:blank'

function navState(): BrowserNav {
  const wc = view?.webContents
  if (!wc || wc.isDestroyed()) return { url: '', title: '', loading: false, canGoBack: false, canGoForward: false }
  const url = wc.getURL()
  return {
    url: blank(url) ? '' : url,
    title: wc.getTitle(),
    loading: wc.isLoading(),
    canGoBack: wc.navigationHistory.canGoBack(),
    canGoForward: wc.navigationHistory.canGoForward()
  }
}

const emitNav = (): void => send('browser:nav', navState())

function addSniffed(
  c: { kind: SniffItem['kind']; ext: string; contentType: string; size: number | null },
  url: string
): void {
  if (sniffed.some((s) => s.url === url)) return
  const wc = view?.webContents
  let host = ''
  try {
    host = new URL(url).hostname
  } catch {
    return
  }
  const item: SniffItem = {
    id: `${Date.now().toString(36)}${(counter++).toString(36)}`,
    url,
    kind: c.kind,
    ext: c.ext,
    contentType: c.contentType,
    size: c.size,
    host,
    pageUrl: wc && !wc.isDestroyed() ? wc.getURL() : '',
    pageTitle: wc && !wc.isDestroyed() ? wc.getTitle() : ''
  }
  sniffed = [...sniffed, item].slice(-MAX_SNIFFED)
  send('browser:sniff', item)
}

function clearSniffed(): void {
  sniffed = []
  send('browser:sniffCleared')
}

let hooked = false
function hookSession(): void {
  if (hooked) return
  hooked = true
  const s = ses()
  s.setUserAgent(browserUserAgent())

  // Untrusted web content gets no device/notification/etc. permissions.
  s.setPermissionRequestHandler((_wc, _perm, cb) => cb(false))
  s.setPermissionCheckHandler(() => false)

  s.webRequest.onHeadersReceived({ urls: ['http://*/*', 'https://*/*'] }, (details, cb) => {
    try {
      if (view && details.webContentsId === view.webContents.id) {
        const c = classifyResponse(details.url, details.statusCode, details.responseHeaders ?? {}, details.resourceType)
        if (c) addSniffed(c, details.url)
      }
    } finally {
      cb({})
    }
  })

  // A clicked download link: don't save anywhere, just offer it in the media list.
  s.on('will-download', (e, item) => {
    e.preventDefault()
    const c = classifyResponse(
      item.getURL(),
      200,
      { 'content-type': item.getMimeType(), 'content-length': String(item.getTotalBytes()) },
      'other'
    )
    if (c) addSniffed(c, item.getURL())
  })
}

function ensureView(): WebContentsView | null {
  if (view && !view.webContents.isDestroyed()) return view
  const win = getWin()
  if (!win) return null
  hookSession()

  view = new WebContentsView({
    webPreferences: {
      partition: PARTITION,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  })
  view.setVisible(false)
  visible = false
  win.contentView.addChildView(view)

  const wc = view.webContents
  wc.setUserAgent(browserUserAgent())

  // New windows/tabs open in the same view; only http(s) is allowed.
  wc.setWindowOpenHandler(({ url }) => {
    if (isValidUrl(url)) void wc.loadURL(url).catch(() => undefined)
    return { action: 'deny' }
  })
  wc.on('will-navigate', (e, url) => {
    if (!isValidUrl(url) && url !== 'about:blank') e.preventDefault()
  })
  wc.on('did-start-navigation', (details) => {
    if (details.isMainFrame && !details.isSameDocument) clearSniffed()
  })
  for (const ev of [
    'did-navigate',
    'did-navigate-in-page',
    'page-title-updated',
    'did-start-loading',
    'did-stop-loading'
  ] as const) {
    wc.on(ev as 'did-navigate', emitNav)
  }
  win.once('closed', () => {
    if (view && !view.webContents.isDestroyed()) view.webContents.close()
    view = null
  })
  return view
}

export function initBrowser(win: () => BrowserWindow | null, emit: Send): void {
  getWin = win
  send = emit
}

export function setBounds(b: BrowserBounds | null): void {
  if (!b) {
    if (view && !view.webContents.isDestroyed()) {
      view.setVisible(false)
      view.webContents.setAudioMuted(true)
    }
    visible = false
    return
  }
  const v = ensureView()
  if (!v) return
  v.setBounds({
    x: Math.round(b.x),
    y: Math.round(b.y),
    width: Math.max(0, Math.round(b.width)),
    height: Math.max(0, Math.round(b.height))
  })
  if (!visible) {
    v.setVisible(true)
    v.webContents.setAudioMuted(false)
    visible = true
  }
}

/** Turn whatever was typed in the address bar into a URL (or a search). */
export function toUrl(input: string): string {
  const t = input.trim()
  if (isValidUrl(t)) return t
  if (/^[^\s/]+\.[a-z]{2,}(:\d+)?([/?#]\S*)?$/i.test(t)) return `https://${t}`
  return `https://duckduckgo.com/?q=${encodeURIComponent(t)}`
}

export async function navigate(input: string): Promise<void> {
  const v = ensureView()
  if (!v || !input.trim()) return
  await v.webContents.loadURL(toUrl(input)).catch(() => undefined) // ERR_ABORTED on redirects etc.
}

export const back = (): void => {
  if (view?.webContents.navigationHistory.canGoBack()) view.webContents.navigationHistory.goBack()
}
export const forward = (): void => {
  if (view?.webContents.navigationHistory.canGoForward()) view.webContents.navigationHistory.goForward()
}
export const reload = (): void => view?.webContents.reload()
export const stop = (): void => view?.webContents.stop()

export async function home(): Promise<void> {
  if (!view || view.webContents.isDestroyed()) return
  await view.webContents.loadURL('about:blank').catch(() => undefined)
  view.webContents.navigationHistory.clear()
  emitNav()
}

export const getNavState = navState
export const listSniffed = (): SniffItem[] => sniffed
export const resetSniffed = clearSniffed

// ---------------------------------------------------------------------------
// Cookies → Netscape file so yt-dlp can reuse the browser's logged-in session.

export async function writeCookieFile(urls: string[]): Promise<string | null> {
  const seen = new Set<string>()
  const lines = ['# Netscape HTTP Cookie File']
  for (const url of new Set(urls.filter(isValidUrl))) {
    for (const c of await ses().cookies.get({ url })) {
      const key = `${c.domain}|${c.path}|${c.name}`
      if (seen.has(key)) continue
      seen.add(key)
      const domain = c.domain ?? ''
      const clean = (s: string): string => s.replace(/[\t\r\n]/g, '')
      lines.push(
        [
          (c.httpOnly ? '#HttpOnly_' : '') + domain,
          domain.startsWith('.') ? 'TRUE' : 'FALSE',
          c.path ?? '/',
          c.secure ? 'TRUE' : 'FALSE',
          String(Math.floor(c.expirationDate ?? 0)),
          clean(c.name),
          clean(c.value)
        ].join('\t')
      )
    }
  }
  if (lines.length === 1) return null
  const file = join(app.getPath('temp'), `vg-cookies-${randomBytes(6).toString('hex')}.txt`)
  await writeFile(file, lines.join('\n') + '\n', { encoding: 'utf8', mode: 0o600 })
  return file
}

export const removeCookieFile = (file: string | null | undefined): Promise<void> =>
  file ? rm(file, { force: true }).catch(() => undefined) : Promise.resolve()
