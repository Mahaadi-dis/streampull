import { create } from 'zustand'
import type { ChannelTab } from '@shared/channel'
import type {
  BinaryState,
  DownloadItem,
  DownloadRequest,
  ErrorCode,
  HistoryItem,
  MediaInfo,
  Settings,
  BrowserNav,
  BrowserTabsState,
  SniffItem,
  UpdateInfo
} from '@shared/types'

export type Page = 'home' | 'browser' | 'downloads' | 'library' | 'settings'

export type Analysis =
  | { status: 'idle' }
  | { status: 'loading'; url: string }
  | { status: 'done'; info: MediaInfo }
  | { status: 'error'; code: ErrorCode; detail?: string }

export interface Toast {
  id: number
  text: string
  tone: 'ok' | 'error' | 'info'
}

interface AppState {
  page: Page
  settings: Settings | null
  binary: BinaryState
  downloads: Record<string, DownloadItem>
  history: HistoryItem[]
  analysis: Analysis
  toasts: Toast[]
  nav: BrowserNav
  tabs: BrowserTabsState
  /** A newer release is available (hidden once dismissed, until the next launch). */
  update: UpdateInfo | null
  sniffed: SniffItem[]
  /** Channel tab currently being loaded (Videos / Shorts / Live). */
  tabLoading: ChannelTab['id'] | null

  init: () => Promise<void>
  setPage: (p: Page) => void
  updateSettings: (patch: Partial<Settings>) => Promise<void>
  analyze: (url: string, cookieUrl?: string | null) => Promise<void>
  clearAnalysis: () => void
  /** Switch the open channel to another tab. Returns an error code, or null on success. */
  loadChannelTab: (tab: ChannelTab) => Promise<ErrorCode | null>
  enqueue: (reqs: DownloadRequest[]) => Promise<void>
  refreshHistory: () => Promise<void>
  toast: (text: string, tone?: Toast['tone']) => void
  dismissToast: (id: number) => void
  dismissUpdate: () => void
}

let toastSeq = 1
let dismissedUpdate = ''
let initialized = false

export const useApp = create<AppState>((set, get) => ({
  page: 'home',
  settings: null,
  binary: { phase: 'checking' },
  downloads: {},
  history: [],
  analysis: { status: 'idle' },
  toasts: [],
  nav: { url: '', title: '', loading: false, canGoBack: false, canGoForward: false },
  tabs: { tabs: [], activeId: '' },
  update: null,
  sniffed: [],
  tabLoading: null,

  init: async () => {
    if (initialized) return
    initialized = true
    const api = window.api
    const [settings, binary, queue, history, nav, sniffed, tabs] = await Promise.all([
      api.getSettings(),
      api.getBinaryState(),
      api.listQueue(),
      api.listHistory(),
      api.browserState(),
      api.listSniffed(),
      api.browserTabs()
    ])
    set({
      settings,
      binary,
      history,
      nav,
      sniffed,
      tabs,
      downloads: Object.fromEntries(queue.map((d) => [d.id, d]))
    })
    api.onBinaryState((binary) => set({ binary }))
    api.onBrowserNav((nav) => set({ nav }))
    api.onSniffed((item) =>
      set((st) => (st.sniffed.some((x) => x.id === item.id) ? st : { sniffed: [...st.sniffed, item] }))
    )
    api.onBrowserTabs((tabs) => set({ tabs }))
    const checkUpdate = async (): Promise<void> => {
      const u = await api.checkForUpdate().catch(() => null)
      set({ update: u && u.version !== dismissedUpdate ? u : null })
    }
    void checkUpdate()
    setInterval(() => void checkUpdate(), 6 * 3600 * 1000)
    api.onSniffList((items) => set({ sniffed: items }))
    api.onQueueUpdate((item) => {
      const prev = get().downloads[item.id]
      set((s) => ({ downloads: { ...s.downloads, [item.id]: { ...item } } }))
      if (item.status === 'completed' && prev?.status !== 'completed') void get().refreshHistory()
    })
    api.onQueueRemove((id) =>
      set((s) => {
        const next = { ...s.downloads }
        delete next[id]
        return { downloads: next }
      })
    )
  },

  setPage: (page) => {
    // The native browser view floats above the DOM, so hide it the moment we leave its page.
    if (get().page === 'browser' && page !== 'browser') void window.api.browserSetBounds(null)
    set({ page })
  },

  updateSettings: async (patch) => {
    const settings = await window.api.setSettings(patch)
    set({ settings: { ...settings } })
  },

  analyze: async (url, cookieUrl) => {
    set({ analysis: { status: 'loading', url } })
    const r = await window.api.analyze(url, cookieUrl)
    if (r.ok) set({ analysis: { status: 'done', info: r.info } })
    else set({ analysis: { status: 'error', code: r.error, detail: r.detail } })
  },

  clearAnalysis: () => set({ analysis: { status: 'idle' }, tabLoading: null }),

  loadChannelTab: async (tab) => {
    const a = get().analysis
    if (a.status !== 'done' || !a.info.channel || get().tabLoading) return null
    set({ tabLoading: tab.id })
    const r = await window.api.analyze(tab.url, a.info.cookieUrl)
    // The user may have closed the card or analyzed something else meanwhile.
    const still = get().analysis
    if (still.status === 'done' && still.info.channel && still.info.title === a.info.title) {
      if (r.ok) set({ analysis: { status: 'done', info: r.info } })
    }
    set({ tabLoading: null })
    return r.ok ? null : r.error
  },

  enqueue: async (reqs) => {
    const added = await window.api.addToQueue(reqs)
    set((s) => ({
      downloads: { ...s.downloads, ...Object.fromEntries(added.map((d) => [d.id, d])) }
    }))
  },

  refreshHistory: async () => set({ history: await window.api.listHistory() }),

  toast: (text, tone = 'info') => {
    const id = toastSeq++
    set((s) => ({ toasts: [...s.toasts, { id, text, tone }] }))
    setTimeout(() => get().dismissToast(id), 3200)
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  dismissUpdate: () => {
    dismissedUpdate = get().update?.version ?? ''
    set({ update: null })
  }
}))
