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
  theme: 'violet',
  defaultQuality: 'best',
  nameTemplate: 'title',
  speedLimit: '',
  notifications: true,
  adBlock: true,
  checkUpdates: true
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

const channelInfo = (url: string): MediaInfo => {
  const tab = (/\/(shorts|streams)\/?$/.exec(url)?.[1] ?? 'videos') as 'videos' | 'shorts' | 'streams'
  const count = tab === 'videos' ? 24 : tab === 'shorts' ? 18 : 9
  const label = { videos: 'فيديو', shorts: 'شورت', streams: 'بث' }[tab]
  return {
    url,
    title: 'قناة تجريبية — Demo Channel',
    thumbnail: thumb(60),
    uploader: 'Demo Channel',
    site: 'Youtube',
    isPlaylist: true,
    options: DEFAULT_QUALITIES,
    channel: {
      activeTab: tab,
      tabs: (['videos', 'shorts', 'streams'] as const).map((id) => ({ id, url: `https://www.youtube.com/@demo/${id}` }))
    },
    entries: Array.from({ length: count }, (_, i) => ({
      id: String(i),
      index: i + 1,
      title: `${label} رقم ${i + 1} — ${tab} #${i + 1}`,
      url: `https://www.youtube.com/watch?v=${tab}${i}`,
      duration: tab === 'shorts' ? 30 + i : 400 + i * 37,
      thumbnail: thumb(70 + i + (tab === 'shorts' ? 30 : 0)),
      liveStatus: tab === 'streams' && i === 0 ? ('live' as const) : tab === 'streams' && i === 1 ? ('upcoming' as const) : null
    }))
  }
}

const accountInfo = (url: string): MediaInfo => ({
  url,
  title: '@demo_account',
  thumbnail: thumb(90),
  uploader: '@demo_account',
  site: 'TikTok',
  isPlaylist: true,
  options: DEFAULT_QUALITIES,
  channel: { kind: 'account', activeTab: 'videos', tabs: [{ id: 'videos', url }] },
  entries: Array.from({ length: 16 }, (_, i) => ({
    id: String(i),
    index: i + 1,
    title: `مقطع تيك توك رقم ${i + 1} #ترند`,
    url: `https://www.tiktok.com/@demo_account/video/${1000 + i}`,
    duration: 15 + i * 3,
    thumbnail: thumb(120 + i),
    liveStatus: null
  }))
})

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
  copyText: async (text) => void navigator.clipboard?.writeText(text),
  readClipboard: async () => 'https://www.youtube.com/watch?v=demo',
  analyze: async (url) => {
    await new Promise((r) => setTimeout(r, 900))
    if (url.includes('youtube.com/@')) return { ok: true, info: channelInfo(url) }
    if (url.includes('tiktok.com/@')) return { ok: true, info: accountInfo(url) }
    if (url.includes('instagram.com/locked')) return { ok: false, error: 'login_required' }
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
  checkForUpdate: async () => null,
  runDiagnostics: async () => 'StreamPull (dev preview)\n\n== Engine ==\nyt-dlp: present - 2026.08.19\n\n== Network ==\nhttps://github.com\n  OK (HTTP 200, 120 ms)',
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
  onSniffList: sub,
  browserTabs: async () => ({
    tabs: [
      { id: 't1', title: 'YouTube', url: 'https://www.youtube.com/', loading: false, media: 2, blocked: 14 },
      { id: 't2', title: 'Vimeo — فيديوهات', url: 'https://vimeo.com/watch', loading: false, media: 0, blocked: 3 },
      { id: 't3', title: '', url: '', loading: false, media: 0, blocked: 0 }
    ],
    activeId: 't3'
  }),
  browserNewTab: noop,
  browserSwitchTab: noop,
  browserCloseTab: noop,
  onBrowserTabs: sub,
  bookmarksList: async () => [
    { id: 'b1', url: 'https://www.youtube.com/', title: 'YouTube', addedAt: 3 },
    { id: 'b2', url: 'https://vimeo.com/watch', title: 'Vimeo — فيديوهات', addedAt: 2 }
  ],
  bookmarkToggle: async () => [],
  bookmarkRemove: async () => [],
  visitsList: async () => [
    { url: 'https://www.dailymotion.com/', title: 'Dailymotion', visitedAt: Date.now() - 3_600_000, visits: 3 },
    { url: 'https://x.com/home', title: 'X', visitedAt: Date.now() - 86_400_000, visits: 1 }
  ],
  visitRemove: async () => [],
  visitsClear: noop,
  browserClearSiteData: noop
}
