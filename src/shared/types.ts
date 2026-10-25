import type { Mp3Quality } from './downloadOptions'
import type { ChannelTab, ChannelTabId } from './channel'
import type { ThemeId } from './themes'

export type Lang = 'ar' | 'en'

export type NameTemplate = 'title' | 'uploader-title' | 'title-id'

export interface Settings {
  downloadDir: string
  concurrency: number
  lang: Lang
  theme: ThemeId
  defaultQuality: QualityKey
  nameTemplate: NameTemplate
  speedLimit: string // '' = unlimited, otherwise yt-dlp rate like "2M"
  notifications: boolean
  /** Block known ad hosts in the embedded browser. */
  adBlock: boolean
  /** Ask GitHub on start-up whether a newer release exists (nothing is downloaded automatically). */
  checkUpdates: boolean
  /** Put the video's thumbnail inside MP3/M4A files as cover art. */
  embedCover: boolean
  /** Crop that cover to a square. */
  squareCover: boolean
  /** Write title / artist / year tags into audio files. */
  embedTags: boolean
  /** Bitrate of MP3 downloads: 'best' (variable) or a fixed kbps. */
  mp3Quality: Mp3Quality
}

/** 'best' | '2160' | '1080' | ... | 'mp3' | 'm4a' */
export type QualityKey = string

export interface QualityOption {
  key: QualityKey
  kind: 'video' | 'audio'
  label: string
  sizeBytes?: number | null
}

export interface PlaylistEntry {
  id: string
  index: number
  title: string
  url: string
  duration?: number | null
  thumbnail?: string | null
  /** Set for streams that are on air or scheduled — they can't be downloaded as files yet. */
  liveStatus?: 'live' | 'upcoming' | null
}

/** Present when the analyzed URL is a YouTube channel: its tabs and the one currently listed. */
export interface ChannelInfo {
  tabs: ChannelTab[]
  activeTab: ChannelTabId
  /** The listing was cut at the cap (very large channels). */
  truncated?: boolean
  /** A social-media profile (TikTok / Instagram) rather than a YouTube channel. */
  kind?: 'channel' | 'account'
}

export interface MediaInfo {
  url: string
  title: string
  thumbnail?: string | null
  duration?: number | null
  uploader?: string | null
  site?: string | null
  isPlaylist: boolean
  entries: PlaylistEntry[]
  options: QualityOption[]
  /** Set when analyzed from the embedded browser, so downloads reuse its cookies. */
  cookieUrl?: string | null
  channel?: ChannelInfo
}

export interface DownloadRequest {
  url: string
  title: string
  thumbnail?: string | null
  duration?: number | null
  uploader?: string | null
  quality: QualityKey
  /** Estimated total size (video+audio) so progress stays monotonic across streams. */
  expectedBytes?: number | null
  /** Page the media came from (sent as Referer for sniffed downloads). */
  referer?: string | null
  /** Pull cookies of the embedded browser for this URL (logged-in sites). */
  cookieUrl?: string | null
  /** Literal output file name (without extension), used for sniffed media. */
  fileName?: string | null
}

export type DownloadStatus =
  | 'queued'
  | 'downloading'
  | 'processing'
  | 'paused'
  | 'completed'
  | 'error'
  | 'canceled'

export interface DownloadItem extends DownloadRequest {
  id: string
  status: DownloadStatus
  percent: number
  speed: number | null
  eta: number | null
  downloadedBytes: number
  totalBytes: number | null
  filePath?: string
  error?: ErrorCode
  errorDetail?: string
  createdAt: number
}

export interface HistoryItem {
  id: string
  url: string
  title: string
  thumbnail?: string | null
  uploader?: string | null
  duration?: number | null
  quality: QualityKey
  kind: 'video' | 'audio'
  filePath: string
  sizeBytes: number | null
  completedAt: number
  /** The link people copy/share: the page the video came from, else the video URL. */
  link?: string
  fileExists?: boolean
}

export type BinaryState =
  | { phase: 'checking' }
  | { phase: 'downloading'; percent: number; item?: 'yt-dlp' | 'ffmpeg' }
  | { phase: 'ready'; version: string }
  | { phase: 'error'; message: string }

export type AnalyzeResult =
  | { ok: true; info: MediaInfo }
  | { ok: false; error: ErrorCode; detail?: string }

export type ErrorCode =
  | 'invalid_url'
  | 'unsupported'
  | 'private'
  | 'login_required'
  | 'drm'
  | 'network'
  | 'not_ready'
  | 'unknown'

export const DEFAULT_QUALITIES: QualityOption[] = [
  { key: 'best', kind: 'video', label: 'Best' },
  { key: '1080', kind: 'video', label: '1080p' },
  { key: '720', kind: 'video', label: '720p' },
  { key: '480', kind: 'video', label: '480p' },
  { key: '360', kind: 'video', label: '360p' },
  { key: 'mp3', kind: 'audio', label: 'MP3' },
  { key: 'm4a', kind: 'audio', label: 'M4A' }
]

export type SniffKind = 'hls' | 'dash' | 'file'

export interface SniffItem {
  id: string
  url: string
  kind: SniffKind
  ext: string
  contentType: string
  size: number | null
  host: string
  pageUrl: string
  pageTitle: string
}

export interface BrowserNav {
  url: string
  title: string
  loading: boolean
  canGoBack: boolean
  canGoForward: boolean
}

/** One open browser tab, as listed in the tab strip. */
export interface BrowserTab {
  id: string
  title: string
  url: string
  loading: boolean
  /** Videos detected on the page so far. */
  media: number
  /** Ad requests blocked on the page so far. */
  blocked: number
}

export interface BrowserTabsState {
  tabs: BrowserTab[]
  activeId: string
  /** Are the full ad-blocker filter lists active, still loading, or unavailable (basic built-in list only)? */
  adEngine: 'loading' | 'ready' | 'offline'
}

export interface BrowserBounds {
  x: number
  y: number
  width: number
  height: number
}

/** A newer StreamPull release than the one running. */
export interface UpdateInfo {
  version: string
  current: string
  url: string
}
