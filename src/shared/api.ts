import type {
  AnalyzeResult,
  BinaryState,
  DownloadItem,
  DownloadRequest,
  HistoryItem,
  Settings,
  BrowserBounds,
  BrowserNav,
  SniffItem
} from './types'

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

  // Embedded browser
  browserSetBounds(b: BrowserBounds | null): Promise<void>
  browserNavigate(input: string): Promise<void>
  browserBack(): Promise<void>
  browserForward(): Promise<void>
  browserReload(): Promise<void>
  browserStop(): Promise<void>
  browserHome(): Promise<void>
  browserState(): Promise<BrowserNav>
  listSniffed(): Promise<SniffItem[]>
  clearSniffed(): Promise<void>
  onBrowserNav(cb: (s: BrowserNav) => void): () => void
  onSniffed(cb: (item: SniffItem) => void): () => void
  onSniffCleared(cb: () => void): () => void
}

declare global {
  interface Window {
    api: Api
  }
}
