import { app, BrowserWindow, session, WebContentsView, type Session } from 'electron'
import { randomBytes } from 'crypto'
import { rm, writeFile } from 'fs/promises'
import { join } from 'path'
import type { BrowserBounds, BrowserNav, BrowserTab, BrowserTabsState, SniffItem } from '@shared/types'
import { Request } from '@ghostery/adblocker-electron'
import { isAdHost, isAdRequest } from '@shared/adblock'
import { classifyResponse } from '@shared/sniffRules'
import { isValidUrl, toBrowserUrl } from '@shared/ytdlpArgs'
import { getAdEngine, startAdEngine } from './adblock'
import { addVisit, setVisitTitle } from './browserData'
import { getSettings } from './settings'

const PARTITION = 'persist:vg-browser'
const MAX_SNIFFED = 60
const MAX_TABS = 20

type Send = (channel: string, payload?: unknown) => void

interface Tab {
  id: string
  view: WebContentsView
  sniffed: SniffItem[]
  blocked: number
}

let getWin: () => BrowserWindow | null = () => null
let send: Send = () => undefined
const tabs: Tab[] = []
/** webContents id → tab, for the session-wide request hooks. */
const byContents = new Map<number, Tab>()
let activeId = ''
/** The Browser page is on screen (otherwise every tab view is hidden). */
let pageVisible = false
let lastBounds: Electron.Rectangle | null = null
let counter = 0

const ses = (): Session => session.fromPartition(PARTITION)

/** The embedded browser should look like a normal Chrome, not "Electron". */
export const browserUserAgent = (): string =>
  app.userAgentFallback.replace(/\s(Electron|streampull|StreamPull)\/\S+/gi, '')

const blank = (u: string): boolean => !u || u === 'about:blank'

const alive = (t: Tab | undefined): t is Tab => !!t && !t.view.webContents.isDestroyed()
const active = (): Tab | undefined => tabs.find((t) => t.id === activeId)

function navOf(t: Tab | undefined): BrowserNav {
  if (!alive(t)) return { url: '', title: '', loading: false, canGoBack: false, canGoForward: false }
  const wc = t.view.webContents
  const url = wc.getURL()
  return {
    url: blank(url) ? '' : url,
    title: wc.getTitle(),
    loading: wc.isLoading(),
    canGoBack: wc.navigationHistory.canGoBack(),
    canGoForward: wc.navigationHistory.canGoForward()
  }
}

function tabInfo(t: Tab): BrowserTab {
  const n = navOf(t)
  return { id: t.id, title: n.title, url: n.url, loading: n.loading, media: t.sniffed.length, blocked: t.blocked }
}

export function getTabsState(): BrowserTabsState {
  return { tabs: tabs.filter(alive).map(tabInfo), activeId }
}

const emitNav = (): void => send('browser:nav', navOf(active()))

let tabsTimer: NodeJS.Timeout | null = null
/** Tab titles, spinners and counters change a lot while a page loads; coalesce the updates. */
function emitTabs(): void {
  if (tabsTimer) return
  tabsTimer = setTimeout(() => {
    tabsTimer = null
    send('browser:tabs', getTabsState())
  }, 120)
}

function changed(t: Tab): void {
  if (t.id === activeId) emitNav()
  emitTabs()
}

function addSniffed(
  t: Tab,
  c: { kind: SniffItem['kind']; ext: string; contentType: string; size: number | null },
  url: string
): void {
  if (t.sniffed.some((s) => s.url === url)) return
  const wc = t.view.webContents
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
    pageUrl: wc.isDestroyed() ? '' : wc.getURL(),
    pageTitle: wc.isDestroyed() ? '' : wc.getTitle()
  }
  t.sniffed = [...t.sniffed, item].slice(-MAX_SNIFFED)
  if (t.id === activeId) send('browser:sniff', item)
  emitTabs()
}

function resetTab(t: Tab): void {
  t.sniffed = []
  t.blocked = 0
  if (t.id === activeId) send('browser:sniffList', [])
  emitTabs()
}

/** Should this sub-resource request be cancelled? Uses the full filter engine once loaded, else the built-in list. */
function shouldBlock(t: Tab, details: Electron.OnBeforeRequestListenerDetails): boolean {
  const pageUrl = t.view.webContents.getURL()
  const e = getAdEngine()
  if (e) {
    const request = Request.fromRawDetails({
      url: details.url,
      sourceUrl: pageUrl,
      type: details.resourceType || 'other',
      requestId: String(details.id),
      tabId: details.webContentsId
    })
    if (e.config.guessRequestTypeFromUrl === true && request.type === 'other') request.guessTypeOfRequest()
    if (e.match(request).match) return true
  }
  return isAdRequest(details.url, pageUrl)
}

function installRequestHooks(s: Session): void {
  // Ad blocker: cancel sub-resource requests to known ad and tracker hosts.
  s.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (details, cb) => {
    const t = details.webContentsId != null ? byContents.get(details.webContentsId) : undefined
    if (alive(t) && details.resourceType !== 'mainFrame' && getSettings().adBlock && shouldBlock(t, details)) {
      t.blocked++
      emitTabs()
      cb({ cancel: true })
      return
    }
    cb({})
  })

  s.webRequest.onHeadersReceived({ urls: ['http://*/*', 'https://*/*'] }, (details, cb) => {
    const t = details.webContentsId != null ? byContents.get(details.webContentsId) : undefined
    if (alive(t)) {
      const c = classifyResponse(details.url, details.statusCode, details.responseHeaders ?? {}, details.resourceType)
      if (c) addSniffed(t, c, details.url)
    }
    // The filter lists can also add CSP rules (e.g. against inline ad scripts).
    const e = getAdEngine()
    if (e && getSettings().adBlock) e.onHeadersReceived(details, cb)
    else cb({})
  })
}

/**
 * Apply the ad-blocker setting to the session. The filter engine registers its own request handlers (and a
 * preload script for hiding ad elements); Electron allows only one handler per event, so ours go back on top.
 */
export function syncAdBlock(): void {
  if (!hooked) return
  const s = ses()
  const e = getAdEngine()
  if (e) {
    const on = getSettings().adBlock
    if (on && !e.isBlockingEnabled(s)) e.enableBlockingInSession(s)
    else if (!on && e.isBlockingEnabled(s)) e.disableBlockingInSession(s)
  }
  installRequestHooks(s)
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

  installRequestHooks(s)
  startAdEngine(() => syncAdBlock())

  // A clicked download link: don't save anywhere, just offer it in the media list.
  s.on('will-download', (e, item, wc) => {
    e.preventDefault()
    const t = byContents.get(wc.id)
    if (!t) return
    const c = classifyResponse(
      item.getURL(),
      200,
      { 'content-type': item.getMimeType(), 'content-length': String(item.getTotalBytes()) },
      'other'
    )
    if (c) addSniffed(t, c, item.getURL())
  })
}

const blocksPopup = (url: string): boolean => {
  if (!getSettings().adBlock) return false
  try {
    return isAdHost(new URL(url).hostname)
  } catch {
    return false
  }
}

function applyVisibility(): void {
  for (const t of tabs) {
    if (!alive(t)) continue
    const show = pageVisible && t.id === activeId && !!lastBounds
    if (lastBounds) t.view.setBounds(lastBounds)
    t.view.setVisible(show)
    t.view.webContents.setAudioMuted(!show)
  }
}

function createTab(initialUrl?: string, activate = true): Tab | null {
  const win = getWin()
  if (!win || win.isDestroyed() || tabs.length >= MAX_TABS) return null
  hookSession()

  const view = new WebContentsView({
    webPreferences: {
      partition: PARTITION,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  })
  view.setVisible(false)
  win.contentView.addChildView(view)

  const tab: Tab = { id: `t${Date.now().toString(36)}${(counter++).toString(36)}`, view, sniffed: [], blocked: 0 }
  tabs.push(tab)
  const wc = view.webContents
  byContents.set(wc.id, tab)
  wc.setMaxListeners(40) // loadURL() adds short-lived listeners; busy pages can exceed the default of 10
  wc.setUserAgent(browserUserAgent())

  // New windows open in a new tab; only http(s) is allowed and ad pop-ups are dropped.
  wc.setWindowOpenHandler(({ url, disposition }) => {
    if (isValidUrl(url)) {
      if (blocksPopup(url)) {
        tab.blocked++
        emitTabs()
      } else createTab(url, disposition !== 'background-tab')
    }
    return { action: 'deny' }
  })
  wc.on('will-navigate', (e, url) => {
    if (!isValidUrl(url) && url !== 'about:blank') e.preventDefault()
    else if (isValidUrl(url) && blocksPopup(url)) {
      e.preventDefault() // a page redirecting you to an ad network
      tab.blocked++
      emitTabs()
    }
  })
  wc.on('did-start-navigation', (details) => {
    if (details.isMainFrame && !details.isSameDocument) resetTab(tab)
  })
  wc.on('did-navigate', (_e, url) => {
    addVisit(url, wc.getTitle())
    changed(tab)
  })
  wc.on('did-navigate-in-page', (_e, url, isMainFrame) => {
    if (isMainFrame) addVisit(url, wc.getTitle())
    changed(tab)
  })
  wc.on('page-title-updated', (_e, title) => {
    setVisitTitle(wc.getURL(), title)
    changed(tab)
  })
  for (const ev of ['did-start-loading', 'did-stop-loading'] as const) wc.on(ev as 'did-navigate', () => changed(tab))
  wc.once('destroyed', () => {
    byContents.delete(wc.id)
    removeTab(tab.id, false)
  })

  if (activate) activeId = tab.id
  applyVisibility()
  if (initialUrl) void wc.loadURL(toBrowserUrl(initialUrl)).catch(() => undefined)
  send('browser:sniffList', activate ? [] : (active()?.sniffed ?? []))
  emitNav()
  emitTabs()
  return tab
}

/** The active tab; opens the first tab on demand. */
function ensureTab(): Tab | null {
  const t = active()
  if (alive(t)) return t
  return createTab()
}

function removeTab(id: string, destroy: boolean): void {
  const i = tabs.findIndex((t) => t.id === id)
  if (i < 0) return
  const [t] = tabs.splice(i, 1)
  const win = getWin()
  if (win && !win.isDestroyed()) {
    try {
      win.contentView.removeChildView(t.view)
    } catch {
      /* already detached */
    }
  }
  if (!t.view.webContents.isDestroyed()) {
    byContents.delete(t.view.webContents.id)
    if (destroy) t.view.webContents.close()
  }
  if (activeId === id) {
    activeId = (tabs[i] ?? tabs[i - 1])?.id ?? ''
    applyVisibility()
    send('browser:sniffList', active()?.sniffed ?? [])
    emitNav()
  }
  emitTabs()
  // The browser page is open and the last tab went away: keep an empty one around.
  if (tabs.length === 0 && pageVisible) createTab()
}

export function initBrowser(win: () => BrowserWindow | null, emit: Send): void {
  getWin = win
  send = emit
}

export function closeAllTabs(): void {
  for (const t of [...tabs]) removeTab(t.id, true)
}

export function setBounds(b: BrowserBounds | null): void {
  if (!b) {
    pageVisible = false
    applyVisibility()
    return
  }
  const t = ensureTab()
  if (!t) return
  lastBounds = {
    x: Math.round(b.x),
    y: Math.round(b.y),
    width: Math.max(0, Math.round(b.width)),
    height: Math.max(0, Math.round(b.height))
  }
  pageVisible = true
  applyVisibility()
}

export async function navigate(input: string): Promise<void> {
  const t = ensureTab()
  if (!t || !input.trim()) return
  await t.view.webContents.loadURL(toBrowserUrl(input)).catch(() => undefined) // ERR_ABORTED on redirects etc.
}

export function newTab(input?: string): void {
  createTab(input?.trim() ? input : undefined)
}

export function switchTab(id: string): void {
  if (!alive(tabs.find((t) => t.id === id))) return
  activeId = id
  applyVisibility()
  send('browser:sniffList', active()?.sniffed ?? [])
  emitNav()
  emitTabs()
}

export function closeTab(id: string): void {
  removeTab(id, true)
}

const wcOf = (): Electron.WebContents | undefined => {
  const t = active()
  return alive(t) ? t.view.webContents : undefined
}

export const back = (): void => {
  if (wcOf()?.navigationHistory.canGoBack()) wcOf()?.navigationHistory.goBack()
}
export const forward = (): void => {
  if (wcOf()?.navigationHistory.canGoForward()) wcOf()?.navigationHistory.goForward()
}
export const reload = (): void => wcOf()?.reload()
export const stop = (): void => wcOf()?.stop()

export async function home(): Promise<void> {
  const wc = wcOf()
  if (!wc) return
  await wc.loadURL('about:blank').catch(() => undefined)
  wc.navigationHistory.clear()
  emitNav()
  emitTabs()
}

/** Sign out everywhere: cookies, local storage, caches. Open tabs keep their pages but lose their sessions. */
export async function clearSiteData(): Promise<void> {
  await ses().clearStorageData()
  await ses().clearCache()
}

export const getNavState = (): BrowserNav => navOf(active())
export const listSniffed = (): SniffItem[] => active()?.sniffed ?? []
export const resetSniffed = (): void => {
  const t = active()
  if (t) resetTab(t)
}

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
