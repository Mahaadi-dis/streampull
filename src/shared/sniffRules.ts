// Pure rules deciding whether a network response is downloadable media (no Electron imports).
import type { SniffKind } from '@shared/types'

export interface Classified {
  kind: SniffKind
  ext: string
  contentType: string
  size: number | null
}

type Headers = Record<string, string | string[] | undefined>

const HLS_TYPES = new Set([
  'application/vnd.apple.mpegurl',
  'application/x-mpegurl',
  'application/mpegurl',
  'audio/mpegurl',
  'audio/x-mpegurl'
])

const FILE_EXTS = new Set(['mp4', 'webm', 'mkv', 'mov', 'm4v', 'flv', 'avi', 'mp3', 'm4a', 'aac', 'ogg', 'oga', 'ogv', 'wav', 'opus', 'flac'])

const TYPE_TO_EXT: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/x-matroska': 'mkv',
  'video/quicktime': 'mov',
  'video/x-flv': 'flv',
  'video/ogg': 'ogv',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'aac',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/webm': 'webm',
  'audio/flac': 'flac'
}

// Fragment/segment types that are never useful on their own.
const SEGMENT_TYPES = new Set(['video/mp2t', 'video/iso.segment', 'audio/mp2t'])
const SEGMENT_EXTS = new Set(['ts', 'm4s', 'cmfv', 'cmfa', 'fmp4'])
const SKIP_RESOURCES = new Set(['image', 'stylesheet', 'font', 'script', 'ping', 'cspReport'])

/** Hosts whose media URLs are signed/ranged and useless outside the page; yt-dlp should take the page URL. */
const PAGE_ONLY_HOSTS = [/(^|\.)googlevideo\.com$/i]

export const MIN_FILE_BYTES = 200 * 1024

const first = (v: string | string[] | undefined): string => (Array.isArray(v) ? (v[0] ?? '') : (v ?? ''))

function lowerHeaders(h: Headers): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(h)) out[k.toLowerCase()] = first(v)
  return out
}

export function extOf(pathname: string): string {
  const m = /\.([a-z0-9]{2,5})$/i.exec(pathname)
  return m ? m[1].toLowerCase() : ''
}

export function totalSize(h: Record<string, string>): number | null {
  const cr = /\/(\d+)\s*$/.exec(h['content-range'] ?? '')
  if (cr) return Number(cr[1])
  const cl = Number(h['content-length'])
  return Number.isFinite(cl) && cl > 0 ? cl : null
}

export function classifyResponse(
  rawUrl: string,
  status: number,
  rawHeaders: Headers,
  resourceType: string
): Classified | null {
  if (status !== 200 && status !== 206) return null
  if (SKIP_RESOURCES.has(resourceType)) return null

  let u: URL
  try {
    u = new URL(rawUrl)
  } catch {
    return null
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
  if (PAGE_ONLY_HOSTS.some((r) => r.test(u.hostname))) return null

  const h = lowerHeaders(rawHeaders)
  const contentType = (h['content-type'] ?? '').split(';')[0].trim().toLowerCase()
  const pathExt = extOf(u.pathname.toLowerCase())

  if (SEGMENT_TYPES.has(contentType) || SEGMENT_EXTS.has(pathExt)) return null

  if (HLS_TYPES.has(contentType) || pathExt === 'm3u8') {
    return { kind: 'hls', ext: 'm3u8', contentType, size: null }
  }
  if (contentType === 'application/dash+xml' || pathExt === 'mpd') {
    return { kind: 'dash', ext: 'mpd', contentType, size: null }
  }

  const isMediaType = contentType.startsWith('video/') || contentType.startsWith('audio/')
  const isGenericWithMediaExt =
    (contentType === 'application/octet-stream' || contentType === 'binary/octet-stream' || contentType === '') &&
    FILE_EXTS.has(pathExt)
  if (!isMediaType && !isGenericWithMediaExt) return null

  const size = totalSize(h)
  if (size === null || size < MIN_FILE_BYTES) return null

  const ext = FILE_EXTS.has(pathExt) ? pathExt : (TYPE_TO_EXT[contentType] ?? (pathExt || 'mp4'))
  return { kind: 'file', ext, contentType, size }
}

/** Safe literal file name (no extension) for an output template. */
export function sanitizeFileName(name: string): string {
  const cleaned = name
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f<>:"/\\|?*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '')
  return cleaned.slice(0, 150)
}
