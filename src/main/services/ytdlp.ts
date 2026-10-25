import { spawn, type ChildProcess } from 'child_process'
import { session } from 'electron'
import { downloadOptionArgs } from '@shared/downloadOptions'
import type { AnalyzeResult, DownloadItem, Settings } from '@shared/types'
import { analyzeWith, type RawResult, type RunOptions } from '@shared/analyze'
import { usesBrowserLogin } from '@shared/accounts'
import { proxyFromRule } from '@shared/proxy'
import { ffmpegPath, getBinaryState, ytdlpPath } from './binaries'
import { browserUserAgent, removeCookieFile, writeCookieFile } from './browser'
import {
  POST_TEMPLATE,
  PROGRESS_TEMPLATE,
  classifyError,
  formatArgs,
  isPostprocessLine,
  isValidUrl,
  outputNameFor,
  parseFileLine,
  parseProgressLine,
  wantsSingle,
  type ProgressUpdate
} from '@shared/ytdlpArgs'

const BASE = ['--no-colors', '--no-warnings', '--ignore-config', '--encoding', 'utf-8']

/**
 * yt-dlp is a separate program and ignores Windows' proxy settings, so on networks that need a proxy (many VPN
 * apps, offices, schools) it cannot reach any site although the browser can. The app asks Chromium which proxy
 * the system wants and hands it to yt-dlp. Refreshed periodically because VPNs switch on and off.
 */
let proxyArgs: string[] = []

export const currentProxyArgs = (): string[] => proxyArgs

export async function refreshProxy(): Promise<void> {
  try {
    const p = proxyFromRule(await session.defaultSession.resolveProxy('https://www.youtube.com'))
    proxyArgs = p ? ['--proxy', p] : []
  } catch {
    proxyArgs = []
  }
}

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
    const r = await analyzeWith((u, o) => runJson(u, cookieFile, o), url)
    // Downloads of what was listed must use the same session.
    const effective = cookieUrl ?? (cookieFile ? url : null)
    return r.ok && effective ? { ok: true, info: { ...r.info, cookieUrl: effective } } : r
  } finally {
    await removeCookieFile(cookieFile)
  }
}

function runJson(url: string, cookieFile: string | null, opts: RunOptions): Promise<RawResult> {
  const args = [...BASE, ...proxyArgs, '-J', '--flat-playlist', '--socket-timeout', '20']
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
    ...proxyArgs,
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
    ...formatArgs(item.quality, settings.mp3Quality),
    ...downloadOptionArgs(item.quality, settings)
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
