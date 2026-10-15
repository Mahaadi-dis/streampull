import { app, net } from 'electron'
import { spawn } from 'child_process'
import { chmodSync, createWriteStream, existsSync, mkdirSync, renameSync, rmSync } from 'fs'
import { join } from 'path'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import { createGunzip } from 'zlib'
import type { ReadableStream as WebReadableStream } from 'stream/web'
import type { BinaryState } from '@shared/types'
import { ffmpegAsset, ytdlpAsset, type Asset } from './binaryAssets'
import { JsonStore } from './jsonStore'

const DAY = 24 * 60 * 60 * 1000

let state: BinaryState = { phase: 'checking' }
/** Automatic retries after a failed set-up (flaky Wi-Fi, a VPN that is still connecting …). */
let retries = 0
let listener: ((s: BinaryState) => void) | null = null
let meta: JsonStore<{ lastUpdateCheck: number }>

const binDir = (): string => join(app.getPath('userData'), 'bin')
const ytdlpAssetNow = (): Asset | null => ytdlpAsset(process.platform, process.arch)
const ffmpegAssetNow = (): Asset | null => ffmpegAsset(process.platform, process.arch)

export const ytdlpPath = (): string => join(binDir(), ytdlpAssetNow()?.file ?? 'yt-dlp')
export const ffmpegPath = (): string => join(binDir(), ffmpegAssetNow()?.file ?? 'ffmpeg')

export const getBinaryState = (): BinaryState => state
export const onBinaryState = (cb: (s: BinaryState) => void): void => {
  listener = cb
}

function setState(s: BinaryState): void {
  state = s
  listener?.(s)
}

/** What actually went wrong with a failed fetch (Node hides the reason in `cause`: ENOTFOUND, ETIMEDOUT, certificate errors …). */
export function describeError(e: unknown): string {
  if (!(e instanceof Error)) return String(e)
  const cause = (e as { cause?: { code?: string; message?: string } }).cause
  const extra = cause?.code ?? cause?.message
  return extra ? `${e.message} (${extra})` : e.message
}

interface RunResult {
  code: number
  out: string
  /** The process could not be started at all (blocked, missing, no permission …). */
  error?: string
}

function run(file: string, args: string[], timeoutMs = 120_000): Promise<RunResult> {
  return new Promise((resolve) => {
    const p = spawn(file, args, { windowsHide: true })
    let out = ''
    const t = setTimeout(() => p.kill(), timeoutMs)
    p.stdout.on('data', (d) => (out += d))
    p.stderr.on('data', (d) => (out += d))
    p.on('error', (e) => {
      clearTimeout(t)
      resolve({ code: -1, out, error: e.message })
    })
    p.on('close', (code) => {
      clearTimeout(t)
      resolve({ code: code ?? -1, out })
    })
  })
}

async function download(asset: Asset, item: 'yt-dlp' | 'ffmpeg'): Promise<void> {
  mkdirSync(binDir(), { recursive: true })
  const dest = join(binDir(), asset.file)
  const tmp = dest + '.download'

  // Chromium's network stack (not Node's fetch): it follows the system proxy and trusts the Windows certificate
  // store, so it works on networks where a browser works (corporate/ISP proxies, antivirus HTTPS scanning).
  let res: Response
  try {
    res = await net.fetch(asset.url, { redirect: 'follow' })
  } catch (e) {
    throw new Error(`${item}: could not download — ${describeError(e)}`)
  }
  if (!res.ok || !res.body) throw new Error(`${item}: download failed (HTTP ${res.status})`)
  const total = Number(res.headers.get('content-length')) || 0
  let got = 0
  setState({ phase: 'downloading', percent: 0, item })

  const src = Readable.fromWeb(res.body as unknown as WebReadableStream)
  src.on('data', (c: Buffer) => {
    got += c.length
    if (total) setState({ phase: 'downloading', percent: Math.min(99, Math.round((got / total) * 100)), item })
  })
  try {
    await pipeline(src, ...(asset.gzip ? [createGunzip()] : []), createWriteStream(tmp))
  } catch (e) {
    rmSync(tmp, { force: true })
    throw e
  }
  if (process.platform !== 'win32') chmodSync(tmp, 0o755)
  renameSync(tmp, dest)
}

/** Windows exit code for "a DLL the program needs is missing" — typically the Visual C++ runtime. */
const STATUS_DLL_NOT_FOUND = 3221225781

/** Why a helper program failed to run, in words a person can act on. */
export function explainRun(name: string, r: RunResult): string {
  const why = r.error
    ? r.error
    : r.code === STATUS_DLL_NOT_FOUND
      ? 'a required Windows component is missing — install the Microsoft Visual C++ Redistributable (x64)'
      : `exit code ${r.code}`
  const tail = r.out.trim().split(/\r?\n/).slice(-2).join(' ').slice(0, 200)
  return `${name} failed to start: ${why}${tail ? ` — ${tail}` : ''}. An antivirus may have blocked or removed it.`
}

async function readYtdlpVersion(): Promise<{ version: string | null; run: RunResult }> {
  const r = await run(ytdlpPath(), ['--version'], 20_000)
  return { version: r.code === 0 ? r.out.trim().split(/\r?\n/).pop() || null : null, run: r }
}

async function ffmpegCheck(): Promise<RunResult> {
  return run(ffmpegPath(), ['-version'], 20_000)
}

/** Run both helpers once and report what happened (used by the diagnostics report). */
export async function probeBinaries(): Promise<{ ytdlp: string; ffmpeg: string }> {
  const show = (name: string, file: string, r: RunResult): string =>
    `${existsSync(file) ? 'present' : 'MISSING'}: ${file} — ${
      r.code === 0 ? r.out.trim().split(/\r?\n/)[0] : explainRun(name, r)
    }`
  return {
    ytdlp: show('yt-dlp', ytdlpPath(), (await readYtdlpVersion()).run),
    ffmpeg: show('ffmpeg', ffmpegPath(), await ffmpegCheck())
  }
}

/** Make sure yt-dlp and FFmpeg exist (downloaded on first run) and refresh yt-dlp once a day. */
export async function ensureBinaries(): Promise<void> {
  meta = new JsonStore('meta', { lastUpdateCheck: 0 })
  try {
    setState({ phase: 'checking' })
    const yt = ytdlpAssetNow()
    const ff = ffmpegAssetNow()
    if (!yt || !ff) throw new Error(`Unsupported platform: ${process.platform}/${process.arch}`)

    if (!existsSync(ytdlpPath())) await download(yt, 'yt-dlp')
    let ytCheck = await readYtdlpVersion()
    if (!ytCheck.version) {
      // corrupted binary → fetch again
      rmSync(ytdlpPath(), { force: true })
      await download(yt, 'yt-dlp')
      ytCheck = await readYtdlpVersion()
    }
    const version = ytCheck.version
    if (!version) throw new Error(explainRun('yt-dlp', ytCheck.run))

    if (!existsSync(ffmpegPath()) || (await ffmpegCheck()).code !== 0) {
      rmSync(ffmpegPath(), { force: true })
      await download(ff, 'ffmpeg')
      const r = await ffmpegCheck()
      if (r.code !== 0) throw new Error(explainRun('ffmpeg', r))
    }

    retries = 0
    setState({ phase: 'ready', version })
    if (Date.now() - meta.data.lastUpdateCheck > DAY) {
      void updateYtdlp().catch(() => undefined)
    }
  } catch (e) {
    setState({ phase: 'error', message: describeError(e) })
    if (retries < 3) {
      retries++
      setTimeout(() => void ensureBinaries(), 30_000 * retries).unref()
    }
  }
}

export async function updateYtdlp(): Promise<BinaryState> {
  if (!existsSync(ytdlpPath()) || !existsSync(ffmpegPath())) {
    await ensureBinaries()
    return state
  }
  await run(ytdlpPath(), ['-U'], 180_000)
  meta.data.lastUpdateCheck = Date.now()
  meta.save()
  const { version } = await readYtdlpVersion()
  if (version) setState({ phase: 'ready', version })
  return state
}
