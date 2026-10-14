import { spawn, type ChildProcess } from 'child_process'
import type { AnalyzeResult, DownloadItem, ErrorCode, Settings } from '@shared/types'
import { parseAccountUrl, usesBrowserLogin, type ParsedAccountUrl } from '@shared/accounts'
import { parseYoutubeChannelUrl, type ParsedChannelUrl } from '@shared/channel'
import { ffmpegPath, getBinaryState, ytdlpPath } from './binaries'
import { browserUserAgent, removeCookieFile, writeCookieFile } from './browser'
import {
  CHANNEL_LIST_CAP,
  CHANNEL_ROOT_PROBE,
  POST_TEMPLATE,
  channelAvatar,
  channelTabsFromRoot,
  PROGRESS_TEMPLATE,
  classifyError,
  formatArgs,
  isPostprocessLine,
  isValidUrl,
  mapInfo,
  outputNameFor,
  parseFileLine,
  parseProgressLine,
  wantsSingle,
  type ProgressUpdate
} from './ytdlpArgs'

const BASE = ['--no-colors', '--no-warnings', '--ignore-config', '--encoding', 'utf-8']

const isWin = process.platform === 'win32'

/** Spawn options: on POSIX the child leads its own process group so the whole tree can be signalled. */
export const spawnOpts = { windowsHide: true, detached: !isWin } as const

export function killTree(child: ChildProcess): void {
  const pid = child.pid
  if (!pid) return
  // The standalone yt-dlp is a bootstrapper that spawns a child → kill the whole tree.
  if (isWin) {
    spawn('taskkill', ['/pid', String(pid), '/T', '/F'], { windowsHide: true })
    return
  }
  const signal = (sig: NodeJS.Signals): void => {
    try {
      process.kill(-pid, sig) // negative pid = the whole process group
    } catch {
      try {
        child.kill(sig)
      } catch {
        /* already gone */
      }
    }
  }
  signal('SIGTERM')
  setTimeout(() => signal('SIGKILL'), 3000).unref()
}

export async function analyze(url: string, cookieUrl?: string | null): Promise<AnalyzeResult> {
  if (!isValidUrl(url)) return { ok: false, error: 'invalid_url' }
  if (getBinaryState().phase !== 'ready') return { ok: false, error: 'not_ready' }

  // Explicit (from the embedded browser), or automatic for social sites the user may have signed in to.
  const cookieSrc = cookieUrl ?? (usesBrowserLogin(url) ? url : null)
  const cookieFile = cookieSrc ? await writeCookieFile([cookieSrc, url]) : null
  try {
    const channel = parseYoutubeChannelUrl(url)
    const account = channel ? null : parseAccountUrl(url)
    const r = channel
      ? await analyzeChannel(channel, url, cookieFile)
      : account
        ? await analyzeAccount(account, url, cookieFile)
        : await analyzeUrl(url, cookieFile)
    // Downloads of what was listed must use the same session.
    const effective = cookieUrl ?? (cookieFile ? url : null)
    return r.ok && effective ? { ok: true, info: { ...r.info, cookieUrl: effective } } : r
  } finally {
    await removeCookieFile(cookieFile)
  }
}

type RawResult = { ok: true; raw: Record<string, unknown> } | { ok: false; error: ErrorCode; detail?: string }

async function analyzeUrl(url: string, cookieFile: string | null): Promise<AnalyzeResult> {
  const r = await runJson(url, cookieFile, { timeoutMs: 90_000 })
  return r.ok ? { ok: true, info: mapInfo(url, r.raw) } : r
}

const ACCOUNT_LIST_CAP = 300

/** A TikTok / Instagram profile: list its posts. */
async function analyzeAccount(
  acc: ParsedAccountUrl,
  originalUrl: string,
  cookieFile: string | null
): Promise<AnalyzeResult> {
  const list = await runJson(acc.base, cookieFile, { timeoutMs: 300_000, playlistEnd: ACCOUNT_LIST_CAP })
  if (!list.ok) return list
  const info = mapInfo(acc.base, list.raw)
  if (!info.isPlaylist) return analyzeUrl(originalUrl, cookieFile)
  const name = `@${acc.handle}`
  return {
    ok: true,
    info: {
      ...info,
      title: name,
      uploader: name,
      site: acc.platform === 'tiktok' ? 'TikTok' : 'Instagram',
      isPlaylist: true,
      channel: {
        kind: 'account',
        tabs: [{ id: 'videos', url: acc.base }],
        activeTab: 'videos',
        truncated: info.entries.length >= ACCOUNT_LIST_CAP
      }
    }
  }
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)

/** A YouTube channel: find its tabs, then list the requested one (Videos by default). */
async function analyzeChannel(
  ch: ParsedChannelUrl,
  originalUrl: string,
  cookieFile: string | null
): Promise<AnalyzeResult> {
  const root = await runJson(ch.base, cookieFile, { timeoutMs: 60_000, playlistEnd: CHANNEL_ROOT_PROBE })
  if (!root.ok) return root

  const tabs = channelTabsFromRoot(root.raw, ch.base)
  const wanted = ch.tab && tabs.some((t) => t.id === ch.tab) ? ch.tab : null
  const active = tabs.find((t) => t.id === (wanted ?? 'videos')) ?? tabs[0]
  if (!active) return analyzeUrl(originalUrl, cookieFile)

  const list = await runJson(active.url, cookieFile, { timeoutMs: 300_000, playlistEnd: CHANNEL_LIST_CAP })
  if (!list.ok) return list

  const info = mapInfo(active.url, list.raw)
  const name = str(root.raw.uploader) ?? str(root.raw.channel) ?? info.title
  return {
    ok: true,
    info: {
      ...info,
      title: name,
      uploader: name,
      thumbnail: channelAvatar(root.raw.thumbnails) ?? info.thumbnail,
      site: 'Youtube',
      isPlaylist: true,
      channel: { tabs, activeTab: active.id, truncated: info.entries.length >= CHANNEL_LIST_CAP }
    }
  }
}

function runJson(
  url: string,
  cookieFile: string | null,
  opts: { timeoutMs: number; playlistEnd?: number }
): Promise<RawResult> {
  const args = [...BASE, '-J', '--flat-playlist', '--socket-timeout', '20']
  if (opts.playlistEnd) args.push('--playlist-end', String(opts.playlistEnd))
  if (cookieFile) args.push('--cookies', cookieFile)
  if (wantsSingle(url)) args.push('--no-playlist')
  args.push('--', url)

  return new Promise((resolve) => {
    const p = spawn(ytdlpPath(), args, spawnOpts)
    const out: Buffer[] = []
    let err = ''
    const timer = setTimeout(() => killTree(p), opts.timeoutMs)
    p.stdout.on('data', (d: Buffer) => out.push(d))
    p.stderr.on('data', (d: Buffer) => (err += d.toString('utf8')))
    p.on('error', (e) => resolve({ ok: false, error: 'unknown', detail: e.message }))
    p.on('close', (code) => {
      clearTimeout(timer)
      if (code !== 0) {
        resolve({ ok: false, error: classifyError(err), detail: err.trim().split(/\r?\n/).pop() })
        return
      }
      try {
        resolve({ ok: true, raw: JSON.parse(Buffer.concat(out).toString('utf8')) as Record<string, unknown> })
      } catch (e) {
        resolve({ ok: false, error: 'unknown', detail: e instanceof Error ? e.message : String(e) })
      }
    })
  })
}

export interface DownloadHandlers {
  onProgress: (p: ProgressUpdate) => void
  onProcessing: () => void
  onFile: (path: string) => void
}

export interface RunningDownload {
  child: ChildProcess
  done: Promise<{ code: number; stderr: string }>
}

export function startDownload(
  item: DownloadItem,
  settings: Settings,
  h: DownloadHandlers,
  cookieFile: string | null = null
): RunningDownload {
  const args = [
    ...BASE,
    '--newline',
    '--progress',
    '--no-playlist',
    '--continue',
    '--windows-filenames',
    '-N',
    '4',
    '--socket-timeout',
    '20',
    '--ffmpeg-location',
    ffmpegPath(),
    '-P',
    settings.downloadDir,
    '-o',
    `${outputNameFor(item.fileName, settings.nameTemplate)}.%(ext)s`,
    '--progress-template',
    PROGRESS_TEMPLATE,
    '--progress-template',
    POST_TEMPLATE,
    '--print',
    'after_move:VGFILE|%(filepath)s',
    ...formatArgs(item.quality)
  ]
  if (settings.speedLimit) args.push('--limit-rate', settings.speedLimit)
  if (cookieFile) args.push('--cookies', cookieFile)
  if (item.referer) args.push('--referer', item.referer, '--user-agent', browserUserAgent())
  args.push('--', item.url)

  const child = spawn(ytdlpPath(), args, spawnOpts)

  let stderr = ''
  let lastEmit = 0
  const handleLine = (line: string): void => {
    const file = parseFileLine(line)
    if (file) return h.onFile(file)
    if (isPostprocessLine(line)) return line.includes('started') ? h.onProcessing() : undefined
    const p = parseProgressLine(line)
    if (p) {
      const now = Date.now()
      if (now - lastEmit >= 250 || p.percent >= 100) {
        lastEmit = now
        h.onProgress(p)
      }
    }
  }
  // yt-dlp writes progress/file markers to stdout but postprocess markers to stderr → read both.
  const lineReader = (onChunk?: (s: string) => void): { push: (d: Buffer) => void; flush: () => void } => {
    let buf = ''
    return {
      push: (d) => {
        const s = d.toString('utf8')
        onChunk?.(s)
        buf += s
        let i: number
        while ((i = buf.indexOf('\n')) >= 0) {
          handleLine(buf.slice(0, i).replace(/\r$/, ''))
          buf = buf.slice(i + 1)
        }
      },
      flush: () => {
        if (buf) handleLine(buf)
        buf = ''
      }
    }
  }
  const out = lineReader()
  const err = lineReader((s) => (stderr = (stderr + s).slice(-4000)))
  child.stdout?.on('data', out.push)
  child.stderr?.on('data', err.push)

  const done = new Promise<{ code: number; stderr: string }>((resolve) => {
    child.on('error', (e) => resolve({ code: -1, stderr: e.message }))
    child.on('close', (code) => {
      out.flush()
      err.flush()
      resolve({ code: code ?? -1, stderr })
    })
  })
  return { child, done }
}
