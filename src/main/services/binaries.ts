import { app } from 'electron'
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

function run(
  file: string,
  args: string[],
  timeoutMs = 120_000
): Promise<{ code: number; out: string }> {
  return new Promise((resolve) => {
    const p = spawn(file, args, { windowsHide: true })
    let out = ''
    const t = setTimeout(() => p.kill(), timeoutMs)
    p.stdout.on('data', (d) => (out += d))
    p.stderr.on('data', (d) => (out += d))
    p.on('error', () => resolve({ code: -1, out }))
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

  const res = await fetch(asset.url, { redirect: 'follow' })
  if (!res.ok || !res.body) throw new Error(`${item}: HTTP ${res.status}`)
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

async function readYtdlpVersion(): Promise<string | null> {
  const r = await run(ytdlpPath(), ['--version'], 20_000)
  return r.code === 0 ? r.out.trim().split(/\r?\n/).pop() || null : null
}

async function ffmpegWorks(): Promise<boolean> {
  return (await run(ffmpegPath(), ['-version'], 20_000)).code === 0
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
    let version = await readYtdlpVersion()
    if (!version) {
      // corrupted binary → fetch again
      rmSync(ytdlpPath(), { force: true })
      await download(yt, 'yt-dlp')
      version = await readYtdlpVersion()
    }
    if (!version) throw new Error('yt-dlp failed to start')

    if (!existsSync(ffmpegPath()) || !(await ffmpegWorks())) {
      rmSync(ffmpegPath(), { force: true })
      await download(ff, 'ffmpeg')
      if (!(await ffmpegWorks())) throw new Error('ffmpeg failed to start')
    }

    setState({ phase: 'ready', version })
    if (Date.now() - meta.data.lastUpdateCheck > DAY) {
      void updateYtdlp().catch(() => undefined)
    }
  } catch (e) {
    setState({ phase: 'error', message: e instanceof Error ? e.message : String(e) })
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
  const version = await readYtdlpVersion()
  if (version) setState({ phase: 'ready', version })
  return state
}
