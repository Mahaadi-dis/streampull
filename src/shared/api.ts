import type {
  AnalyzeResult,
  BinaryState,
  DownloadItem,
  DownloadRequest,
  HistoryItem,
  Settings,
  BrowserBounds,
  BrowserNav,
  BrowserTabsState,
  SniffItem,
  UpdateInfo
} from './types'
import type { Bookmark, Visit } from './bookmarks'

export interface Api {
  getBinaryState(): Promise<BinaryState>
  updateYtdlp(): Promise<BinaryState>
  onBinaryState(cb: (s: BinaryState) => void): () => void

  getSettings(): Promise<Settings>
  setSettings(patch: Partial<Settings>): Promise<Settings>
  chooseFolder(): Promise<string | null>
  readClipboard(): Promise<string>

  analyze(url: string, cookieUrl?: string | null): Promise<AnalyzeResult>

  listQueue(): Promise<DownloadItem[]>
  addToQueue(reqs: DownloadRequest[]): Promise<DownloadItem[]>
  pause(id: string): Promise<void>
  resume(id: string): Promise<void>
  cancel(id: string): Promise<void>
  retry(id: string): Promise<void>
  removeFromQueue(id: string): Promise<void>
  clearFinished(): Promise<void>
  onQueueUpdate(cb: (item: DownloadItem) => void): () => void
  onQueueRemove(cb: (id: string) => void): () => void

  listHistory(): Promise<HistoryItem[]>
  removeHistory(id: string, deleteFile: boolean): Promise<void>
  clearHistory(): Promise<void>

  openFile(id: string): Promise<boolean>
  showInFolder(id: string): Promise<void>
  openDownloadDir(): Promise<void>
  openExternal(url: string): Promise<void>
  /** The newer release, if there is one (null when up to date, offline, or the check is turned off). */
  checkForUpdate(): Promise<UpdateInfo | null>

  // Embedded browser
  browserSetBounds(b: BrowserBounds | null): Promise<void>
  browserNavigate(input: string): Promise<void>
  browserBack(): Promise<void>
  browserForward(): Promise<void>
  browserReload(): Promise<void>
  browserStop(): Promise<void>
  browserHome(): Promise<void>
  browserState(): Promise<BrowserNav>
  browserTabs(): Promise<BrowserTabsState>
  browserNewTab(input?: string): Promise<void>
  browserSwitchTab(id: string): Promise<void>
  browserCloseTab(id: string): Promise<void>
  listSniffed(): Promise<SniffItem[]>
  clearSniffed(): Promise<void>
  onBrowserNav(cb: (s: BrowserNav) => void): () => void
  onSniffed(cb: (item: SniffItem) => void): () => void
  /** The whole media list of the active tab (after a clear or a tab switch). */
  onSniffList(cb: (items: SniffItem[]) => void): () => void
  onBrowserTabs(cb: (s: BrowserTabsState) => void): () => void

  // Bookmarks and browsing history
  bookmarksList(): Promise<Bookmark[]>
  bookmarkToggle(url: string, title: string): Promise<Bookmark[]>
  bookmarkRemove(id: string): Promise<Bookmark[]>
  visitsList(): Promise<Visit[]>
  visitRemove(url: string): Promise<Visit[]>
  visitsClear(): Promise<void>
  /** Sign out of every site and wipe cookies, caches and stored site data of the built-in browser. */
  browserClearSiteData(): Promise<void>
}

declare global {
  interface Window {
    api: Api
  }
}
