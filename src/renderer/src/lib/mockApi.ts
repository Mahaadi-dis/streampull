// Dev-only fake `window.api` so the UI can be previewed in a plain browser tab.
import type { Api } from '@shared/api'
import type { DownloadItem, HistoryItem, MediaInfo, Settings } from '@shared/types'
import { DEFAULT_QUALITIES } from '@shared/types'

const now = Date.now()
const thumb = (n: number): string => `https://picsum.photos/seed/vg${n}/640/360`

const settings: Settings = {
  downloadDir: 'C:\\Users\\Mahdi\\Downloads\\StreamPull',
  concurrency: 3,
  lang: 'ar',
  defaultQuality: 'best',
  nameTemplate: 'title',
  speedLimit: '',
  notifications: true
}

const base = (i: number, o: Partial<DownloadItem>): DownloadItem => ({
  id: `d${i}`,
  url: `https://example.com/v/${i}`,
  title: `مقطع تجريبي رقم ${i} — Sample video ${i}`,
  thumbnail: thumb(i),
  duration: 200 + i * 37,
  uploader: 'Channel',
  quality: '1080',
  status: 'queued',
  percent: 0,
  speed: null,
  eta: null,
  downloadedBytes: 0,
  totalBytes: null,
  createdAt: now - i * 1000,
  ...o
})

let queue: DownloadItem[] = [
  base(1, { status: 'downloading', percent: 46, speed: 3_400_000, eta: 42, downloadedBytes: 61_000_000, totalBytes: 132_000_000 }),
  base(2, { status: 'processing', percent: 100, quality: 'best' }),
  base(3, { status: 'queued' }),
  base(4, { status: 'paused', percent: 18, quality: '720' }),
  base(5, { status: 'error', error: 'private' }),
  base(6, { status: 'completed', percent: 100, quality: 'mp3', totalBytes: 8_400_000 })
]

const history: HistoryItem[] = Array.from({ length: 7 }, (_, i) => ({
  id: `h${i}`,
  url: `https://example.com/h/${i}`,
  title: `فيديو محفوظ ${i + 1} — Saved clip ${i + 1}`,
  thumbnail: thumb(10 + i),
  uploader: 'Channel',
  duration: 300 + i * 61,
  quality: i % 3 === 2 ? 'mp3' : i % 2 ? '720' : '1080',
  kind: i % 3 === 2 ? 'audio' : 'video',
  filePath: `C:\\x\\${i}.mp4`,
  sizeBytes: 40_000_000 + i * 9_000_000,
  completedAt: now - i * 3_600_000 * 7,
  fileExists: i !== 4
}))

const info = (url: string): MediaInfo =>
  /list|playlist/.test(url)
    ? {
        url,
        title: 'قائمة تشغيل تجريبية — Demo playlist',
        thumbnail: thumb(30),
        uploader: 'Demo Channel',
        site: 'Youtube',
        isPlaylist: true,
        options: DEFAULT_QUALITIES,
        entries: Array.from({ length: 12 }, (_, i) => ({
          id: String(i),
          index: i + 1,
          title: `الحلقة ${i + 1} — Episode ${i + 1}`,
          url: `https://example.com/e/${i}`,
          duration: 600 + i * 45,
          thumbnail: thumb(40 + i)
        }))
      }
    : {
        url,
        title: 'كيف تبني تطبيق سطح مكتب حديث — Building a modern desktop app',
        thumbnail: thumb(7),
        duration: 1234,
        uploader: 'Tech Channel',
        site: 'Youtube',
        isPlaylist: false,
        entries: [],
        options: [
          { key: 'best', kind: 'video', label: 'Best', sizeBytes: 612_000_000 },
          { key: '2160', kind: 'video', label: '2160p', sizeBytes: 612_000_000 },
          { key: '1080', kind: 'video', label: '1080p', sizeBytes: 211_000_000 },
          { key: '720', kind: 'video', label: '720p', sizeBytes: 98_000_000 },
          { key: '480', kind: 'video', label: '480p', sizeBytes: 54_000_000 },
          { key: 'mp3', kind: 'audio', label: 'MP3', sizeBytes: 19_000_000 },
          { key: 'm4a', kind: 'audio', label: 'M4A', sizeBytes: 19_000_000 }
        ]
      }

const noop = async (): Promise<void> => undefined
const sub = (): (() => void) => () => undefined

export const mockApi: Api = {
  getBinaryState: async () => ({ phase: 'ready', version: '2026.08.19' }),
  updateYtdlp: async () => ({ phase: 'ready', version: '2026.08.19' }),
  onBinaryState: sub,
  getSettings: async () => settings,
  setSettings: async (p) => Object.assign(settings, p),
  chooseFolder: async () => null,
  readClipboard: async () => 'https://www.youtube.com/watch?v=demo',
  analyze: async (url) => {
    await new Promise((r) => setTimeout(r, 900))
    return url.includes('bad') ? { ok: false, error: 'unsupported' } : { ok: true, info: info(url) }
  },
  listQueue: async () => queue,
  addToQueue: async (reqs) => {
    const added = reqs.map((r, i) => base(100 + queue.length + i, { ...r, status: 'queued' }))
    queue = [...queue, ...added]
    return added
  },
  pause: noop,
  resume: noop,
  cancel: noop,
  retry: noop,
  removeFromQueue: noop,
  clearFinished: noop,
  onQueueUpdate: sub,
  onQueueRemove: sub,
  listHistory: async () => history,
  removeHistory: noop,
  clearHistory: noop,
  openFile: async () => true,
  showInFolder: noop,
  openDownloadDir: noop,
  openExternal: noop,
  browserSetBounds: noop,
  browserNavigate: noop,
  browserBack: noop,
  browserForward: noop,
  browserReload: noop,
  browserStop: noop,
  browserHome: noop,
  browserState: async () => ({ url: '', title: '', loading: false, canGoBack: false, canGoForward: false }),
  listSniffed: async () => [
    { id: 's1', url: 'https://cdn.example.com/video/master.m3u8', kind: 'hls', ext: 'm3u8', contentType: 'application/vnd.apple.mpegurl', size: null, host: 'cdn.example.com', pageUrl: 'https://example.com/watch', pageTitle: 'فيديو تجريبي — Demo clip' },
    { id: 's2', url: 'https://cdn.example.com/video/clip.mp4', kind: 'file', ext: 'mp4', contentType: 'video/mp4', size: 48_200_000, host: 'cdn.example.com', pageUrl: 'https://example.com/watch', pageTitle: 'فيديو تجريبي — Demo clip' }
  ],
  clearSniffed: noop,
  onBrowserNav: sub,
  onSniffed: sub,
  onSniffCleared: sub
}
