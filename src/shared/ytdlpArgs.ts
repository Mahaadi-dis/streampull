// Pure helpers (no Electron imports) so they can be unit-tested.
import type {
  ErrorCode,
  MediaInfo,
  NameTemplate,
  PlaylistEntry,
  QualityKey,
  QualityOption
} from '@shared/types'
import { DEFAULT_QUALITIES } from '@shared/types'
import { sanitizeFileName } from './sniffRules'
import { mp3QualityArg, type Mp3Quality } from './downloadOptions'
import { CHANNEL_TABS, channelTabUrl, type ChannelTab } from '@shared/channel'

export const isAudioQuality = (q: QualityKey): boolean => q === 'mp3' || q === 'm4a'

/** Format-selection args for a chosen quality. */
export function formatArgs(quality: QualityKey, mp3Quality: Mp3Quality = 'best'): string[] {
  if (quality === 'mp3') return ['-f', 'ba/b', '-x', '--audio-format', 'mp3', '--audio-quality', mp3QualityArg(mp3Quality)]
  if (quality === 'm4a') return ['-f', 'ba[ext=m4a]/ba/b', '-x', '--audio-format', 'm4a']
  const h = Number(quality)
  const filter = Number.isFinite(h) && h > 0 ? `[height<=${h}]` : ''
  return [
    '-f',
    `bv*${filter}+ba/b${filter}/b`,
    '-S',
    'res,vcodec:h264,acodec:m4a',
    '--merge-output-format',
    'mp4'
  ]
}

export function outputName(t: NameTemplate): string {
  switch (t) {
    case 'uploader-title':
      return '%(uploader|)s - %(title).120B'
    case 'title-id':
      return '%(title).120B [%(id)s]'
    default:
      return '%(title).150B'
  }
}

/** Output template: a literal sanitized name when given (sniffed media), else the configured template. */
export function outputNameFor(fileName: string | null | undefined, t: NameTemplate): string {
  const clean = fileName ? sanitizeFileName(fileName) : ''
  return clean ? clean.replace(/%/g, '%%') : outputName(t)
}

/** Turn whatever was typed in a browser address bar into a URL (or a search). */
export function toBrowserUrl(input: string): string {
  const t = input.trim()
  if (isValidUrl(t)) return t
  if (/^[^\s/]+\.[a-z]{2,}(:\d+)?([/?#]\S*)?$/i.test(t)) return `https://${t}`
  return `https://duckduckgo.com/?q=${encodeURIComponent(t)}`
}

export const PROGRESS_PREFIX = 'VGP|'
export const POST_PREFIX = 'VGPP|'
export const FILE_PREFIX = 'VGFILE|'

export const PROGRESS_TEMPLATE =
  `download:${PROGRESS_PREFIX}%(progress.downloaded_bytes)s|%(progress.total_bytes)s|` +
  `%(progress.total_bytes_estimate)s|%(progress.speed)s|%(progress.eta)s`
export const POST_TEMPLATE = `postprocess:${POST_PREFIX}%(progress.status)s`

export interface ProgressUpdate {
  downloadedBytes: number
  totalBytes: number | null
  percent: number
  speed: number | null
  eta: number | null
}

const num = (s: string | undefined): number | null => {
  if (s === undefined) return null
  const n = Number(s)
  return s.trim() === '' || s === 'NA' || s === 'None' || !Number.isFinite(n) ? null : n
}

export function parseProgressLine(line: string): ProgressUpdate | null {
  if (line.includes(POST_PREFIX)) return null
  const i = line.indexOf(PROGRESS_PREFIX)
  if (i < 0) return null
  const [dl, total, est, speed, eta] = line.slice(i + PROGRESS_PREFIX.length).trim().split('|')
  const downloadedBytes = num(dl) ?? 0
  const totalBytes = num(total) ?? num(est)
  const percent = totalBytes ? Math.min(100, (downloadedBytes / totalBytes) * 100) : 0
  return { downloadedBytes, totalBytes, percent, speed: num(speed), eta: num(eta) }
}

export const isPostprocessLine = (line: string): boolean => line.includes(POST_PREFIX)

export function parseFileLine(line: string): string | null {
  const i = line.indexOf(FILE_PREFIX)
  return i < 0 ? null : line.slice(i + FILE_PREFIX.length).trim() || null
}

export function classifyError(text: string): ErrorCode {
  const t = text.toLowerCase()
  if (t.includes('unsupported url')) return 'unsupported'
  if (t.includes('drm')) return 'drm'
  // Social sites that need a signed-in session (cookies from the embedded browser fix this).
  if (/(instagram|facebook|tiktok)/.test(t) && /(unable to extract|login|log in|--cookies|empty media|not available)/.test(t))
    return 'login_required'
  if (
    /private video|sign in|log ?in|members-only|members only|confirm your age|age-restricted|not available in your country|video unavailable|this video is not available/.test(
      t
    )
  )
    return 'private'
  if (
    /getaddrinfo|temporary failure|timed out|timeout|connection (reset|refused|aborted)|urlopen error|network is unreachable|unable to download (webpage|json)/.test(
      t
    )
  )
    return 'network'
  return 'unknown'
}

/** Most useful line of yt-dlp's stderr for showing the user. */
export function lastErrorLine(stderr: string): string | undefined {
  const lines = stderr
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith(POST_PREFIX))
  return [...lines].reverse().find((l) => l.startsWith('ERROR')) ?? lines.at(-1)
}

interface RawFormat {
  height?: number | null
  vcodec?: string
  acodec?: string
  filesize?: number | null
  filesize_approx?: number | null
}

const fsize = (f: RawFormat): number => f.filesize ?? f.filesize_approx ?? 0

/** Build the quality ladder (with size estimates) from yt-dlp's format list. */
export function buildQualityOptions(formats: RawFormat[] | undefined): QualityOption[] {
  const fm = formats ?? []
  const video = fm.filter((f) => f.vcodec && f.vcodec !== 'none' && f.height)
  const audio = fm.filter((f) => f.acodec && f.acodec !== 'none' && (!f.vcodec || f.vcodec === 'none'))
  const bestAudio = audio.reduce((m, f) => Math.max(m, fsize(f)), 0)

  if (!video.length && !audio.length) return DEFAULT_QUALITIES

  const heights = [...new Set(video.map((f) => f.height as number))].sort((a, b) => b - a)
  const opts: QualityOption[] = []
  const sizeFor = (h: number): number | null => {
    const v = video.filter((f) => f.height === h).reduce((m, f) => Math.max(m, fsize(f)), 0)
    // muxed formats already include audio
    const muxed = video.some((f) => f.height === h && f.acodec && f.acodec !== 'none')
    const total = v + (muxed ? 0 : bestAudio)
    return total > 0 ? total : null
  }
  if (heights.length) {
    opts.push({ key: 'best', kind: 'video', label: 'Best', sizeBytes: sizeFor(heights[0]) })
    for (const h of heights) {
      if (h < 144) continue
      opts.push({ key: String(h), kind: 'video', label: `${h}p`, sizeBytes: sizeFor(h) })
    }
  } else {
    opts.push({ key: 'best', kind: 'video', label: 'Best' })
  }
  const aSize = bestAudio > 0 ? bestAudio : null
  opts.push({ key: 'mp3', kind: 'audio', label: 'MP3', sizeBytes: aSize })
  opts.push({ key: 'm4a', kind: 'audio', label: 'M4A', sizeBytes: aSize })
  return opts
}

interface RawEntry {
  id?: string
  title?: string
  url?: string
  webpage_url?: string
  duration?: number | null
  thumbnail?: string | null
  thumbnails?: { url?: string }[]
  live_status?: string | null
}

const isHttp = (s: unknown): s is string => typeof s === 'string' && /^https?:\/\//i.test(s)

export function mapInfo(url: string, raw: Record<string, unknown>): MediaInfo {
  const r = raw as {
    _type?: string
    title?: string
    thumbnail?: string
    thumbnails?: { url?: string }[]
    duration?: number
    uploader?: string
    channel?: string
    extractor_key?: string
    entries?: (RawEntry | null)[]
    formats?: RawFormat[]
    webpage_url?: string
  }
  const thumb = (e: { thumbnail?: string | null; thumbnails?: { url?: string }[] }): string | null =>
    e.thumbnail ?? e.thumbnails?.filter((t) => t.url).at(-1)?.url ?? null

  if (r._type === 'playlist' || Array.isArray(r.entries)) {
    const entries: PlaylistEntry[] = []
    ;(r.entries ?? []).forEach((e, i) => {
      if (!e) return
      const u = isHttp(e.url) ? e.url : isHttp(e.webpage_url) ? e.webpage_url : null
      if (!u) return
      entries.push({
        id: e.id ?? String(i + 1),
        index: i + 1,
        title: e.title || e.id || `#${i + 1}`,
        url: u,
        duration: e.duration ?? null,
        thumbnail: thumb(e),
        liveStatus: e.live_status === 'is_live' ? 'live' : e.live_status === 'is_upcoming' ? 'upcoming' : null
      })
    })
    return {
      url,
      title: r.title || url,
      thumbnail: thumb(r) ?? entries[0]?.thumbnail ?? null,
      uploader: r.uploader ?? r.channel ?? null,
      site: r.extractor_key ?? null,
      isPlaylist: true,
      entries,
      options: DEFAULT_QUALITIES
    }
  }
  return {
    url: isHttp(r.webpage_url) ? r.webpage_url : url,
    title: r.title || url,
    thumbnail: thumb(r),
    duration: r.duration ?? null,
    uploader: r.uploader ?? r.channel ?? null,
    site: r.extractor_key ?? null,
    isPlaylist: false,
    entries: [],
    options: buildQualityOptions(r.formats)
  }
}

export function isValidUrl(s: string): boolean {
  try {
    const u = new URL(s)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

/** For video URLs that also carry a ?list= param, treat as a single video. */
export const wantsSingle = (url: string): boolean => /[?&]v=/.test(url) && /[?&]list=/.test(url)

// ---------------------------------------------------------------------------
// YouTube channels

/** How many tab entries to ask for when probing a channel root (each tab is limited to this many items too). */
export const CHANNEL_ROOT_PROBE = 8
/** Upper bound for one tab listing, so a huge channel can't stall or exhaust memory. */
export const CHANNEL_LIST_CAP = 3000

/**
 * Which of Videos / Shorts / Live-streams a channel has, from yt-dlp's root listing.
 * Multi-tab channels return the tabs as nested playlists; single-tab channels return videos directly.
 */
export function channelTabsFromRoot(raw: Record<string, unknown>, base: string): ChannelTab[] {
  const entries = Array.isArray(raw.entries) ? (raw.entries as Record<string, unknown>[]) : []
  const found = new Set<string>()
  for (const e of entries) {
    if (!e || e._type !== 'playlist') continue
    const u = String(e.webpage_url ?? e.url ?? '')
    const m = /\/(videos|shorts|streams)\/?$/.exec(u)
    if (m) found.add(m[1])
  }
  if (found.size === 0) found.add('videos') // single-tab channel
  return CHANNEL_TABS.filter((id) => found.has(id)).map((id) => ({ id, url: channelTabUrl(base, id) }))
}

/** Square avatar URL from a channel's thumbnail list (the original is huge: `=s0`). */
export function channelAvatar(thumbnails: unknown): string | null {
  if (!Array.isArray(thumbnails)) return null
  const av = (thumbnails as { id?: string; url?: string }[]).find((t) => /avatar/i.test(t.id ?? '') && t.url)
  if (!av?.url) return null
  return av.url.replace(/=s\d+[^/]*$/, '=s176-c')
}
