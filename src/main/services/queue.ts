import { Notification, shell } from 'electron'
import { randomUUID } from 'crypto'
import { mkdirSync, statSync } from 'fs'
import type { DownloadItem, DownloadRequest } from '@shared/types'
import { addHistory } from './history'
import { usesBrowserLogin } from '@shared/accounts'
import { removeCookieFile, writeCookieFile } from './browser'
import { getSettings } from './settings'
import { killTree, startDownload, type RunningDownload } from './ytdlp'
import { classifyError, isAudioQuality, lastErrorLine } from '@shared/ytdlpArgs'

type Emit = (item: DownloadItem) => void

const items = new Map<string, DownloadItem>()
const running = new Map<string, RunningDownload>()
const stopping = new Map<string, 'pause' | 'cancel'>()

let emitItem: Emit = () => undefined
let emitRemove: (id: string) => void = () => undefined

export function bindQueue(update: Emit, remove: (id: string) => void): void {
  emitItem = update
  emitRemove = remove
}

const touch = (item: DownloadItem, patch: Partial<DownloadItem>): void => {
  Object.assign(item, patch)
  emitItem(item)
}

export const listQueue = (): DownloadItem[] => [...items.values()]

export function addToQueue(reqs: DownloadRequest[]): DownloadItem[] {
  const added = reqs.map<DownloadItem>((r) => ({
    ...r,
    id: randomUUID(),
    status: 'queued',
    percent: 0,
    speed: null,
    eta: null,
    downloadedBytes: 0,
    totalBytes: null,
    createdAt: Date.now()
  }))
  for (const it of added) {
    items.set(it.id, it)
    emitItem(it)
  }
  pump()
  return added
}

function pump(): void {
  const limit = getSettings().concurrency
  for (const item of items.values()) {
    if (running.size >= limit) break
    if (item.status === 'queued' && !running.has(item.id)) void run(item)
  }
}

async function run(item: DownloadItem): Promise<void> {
  const settings = getSettings()
  try {
    mkdirSync(settings.downloadDir, { recursive: true })
  } catch (e) {
    touch(item, { status: 'error', error: 'unknown', errorDetail: e instanceof Error ? e.message : String(e) })
    return
  }

  let file: string | undefined
  const cookieSrc = item.cookieUrl ?? (usesBrowserLogin(item.url) ? item.url : null)
  const cookieFile = cookieSrc ? await writeCookieFile([cookieSrc, item.url]).catch(() => null) : null
  touch(item, { status: 'downloading', error: undefined, errorDetail: undefined, speed: null, eta: null })

  // A video+audio download runs as two streams whose byte counters restart at 0.
  // Accumulate across streams so the bar never jumps back.
  let base = 0
  let last = 0
  const job = startDownload(item, settings, {
    onProgress: (p) => {
      if (item.status !== 'downloading') return
      if (p.downloadedBytes < last * 0.9) base += last
      last = p.downloadedBytes
      const done = base + p.downloadedBytes
      const expected = item.expectedBytes
      const percent = expected
        ? Math.max(item.percent, Math.min(99, (done / expected) * 100))
        : base
          ? Math.max(item.percent, p.percent)
          : p.percent
      touch(item, {
        percent,
        speed: p.speed,
        eta: expected && p.speed ? Math.max(0, (expected - done) / p.speed) : p.eta,
        downloadedBytes: done,
        totalBytes: expected ?? p.totalBytes ?? item.totalBytes
      })
    },
    onProcessing: () => touch(item, { status: 'processing', percent: 100, speed: null, eta: null }),
    onFile: (p) => (file = p)
  }, cookieFile)
  running.set(item.id, job)

  const { code, stderr } = await job.done
  void removeCookieFile(cookieFile)
  running.delete(item.id)
  const why = stopping.get(item.id)
  stopping.delete(item.id)

  if (why === 'pause') {
    touch(item, { status: 'paused', speed: null, eta: null })
  } else if (why === 'cancel') {
    touch(item, { status: 'canceled', speed: null, eta: null })
  } else if (code === 0) {
    complete(item, file)
  } else {
    touch(item, {
      status: 'error',
      speed: null,
      eta: null,
      error: classifyError(stderr),
      errorDetail: lastErrorLine(stderr)
    })
  }
  pump()
}

function complete(item: DownloadItem, file: string | undefined): void {
  let size: number | null = null
  if (file) {
    try {
      size = statSync(file).size
    } catch {
      /* file moved/deleted */
    }
  }
  touch(item, {
    status: 'completed',
    percent: 100,
    speed: null,
    eta: null,
    filePath: file,
    totalBytes: size ?? item.totalBytes
  })
  if (file) {
    addHistory({
      id: item.id,
      url: item.url,
      title: item.title,
      thumbnail: item.thumbnail,
      uploader: item.uploader,
      duration: item.duration,
      quality: item.quality,
      kind: isAudioQuality(item.quality) ? 'audio' : 'video',
      filePath: file,
      sizeBytes: size,
      completedAt: Date.now()
    })
  }
  if (getSettings().notifications && Notification.isSupported()) {
    const n = new Notification({ title: 'StreamPull', body: item.title, silent: false })
    if (file) n.on('click', () => shell.showItemInFolder(file))
    n.show()
  }
}

export function pause(id: string): void {
  const item = items.get(id)
  if (!item) return
  const job = running.get(id)
  if (job) {
    stopping.set(id, 'pause')
    killTree(job.child)
  } else if (item.status === 'queued') {
    touch(item, { status: 'paused' })
  }
}

export function resume(id: string): void {
  const item = items.get(id)
  if (item?.status === 'paused') {
    touch(item, { status: 'queued' })
    pump()
  }
}

export function cancel(id: string): void {
  const item = items.get(id)
  if (!item) return
  const job = running.get(id)
  if (job) {
    stopping.set(id, 'cancel')
    killTree(job.child)
  } else if (item.status === 'queued' || item.status === 'paused') {
    touch(item, { status: 'canceled' })
  }
}

export function retry(id: string): void {
  const item = items.get(id)
  if (item && (item.status === 'error' || item.status === 'canceled')) {
    touch(item, { status: 'queued', percent: 0, error: undefined, errorDetail: undefined })
    pump()
  }
}

export function removeFromQueue(id: string): void {
  const item = items.get(id)
  if (!item || running.has(id)) return
  items.delete(id)
  emitRemove(id)
}

export function clearFinished(): void {
  for (const [id, it] of items) {
    if (it.status === 'completed' || it.status === 'canceled' || it.status === 'error') {
      items.delete(id)
      emitRemove(id)
    }
  }
}

export function killAll(): void {
  for (const job of running.values()) killTree(job.child)
}

/** Called when the concurrency setting changes. */
export const repump = pump
