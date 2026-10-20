import { app, net } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import { ElectronBlocker } from '@ghostery/adblocker-electron'

/**
 * The full ad/tracker filter engine (EasyList + EasyPrivacy and friends, via Ghostery's open-source
 * `@ghostery/adblocker`). The filter lists are downloaded the first time they are needed and cached in the
 * user-data folder, then refreshed weekly — nothing is bundled, so the app stays MIT. Until the engine is
 * ready (first run, or offline) the small built-in host list in `@shared/adblock` keeps working.
 */

const MAX_AGE_MS = 7 * 24 * 3600 * 1000

let engine: ElectronBlocker | null = null
let starting = false
let lastError = ''
let attempts = 0

export const getAdEngine = (): ElectronBlocker | null => engine
export const getAdEngineError = (): string => lastError

/** 'ready': the full filter lists are active. 'offline': they could not be loaded (the basic built-in list is used). */
export function getAdEngineState(): 'loading' | 'ready' | 'offline' {
  return engine ? 'ready' : lastError ? 'offline' : 'loading'
}

// Chromium's network stack (system proxy and certificates), not Node's fetch.
const netFetch = ((url: string, init?: RequestInit) => net.fetch(String(url), init)) as unknown as typeof fetch

const load = (path: string): Promise<ElectronBlocker> =>
  ElectronBlocker.fromPrebuiltAdsAndTracking(netFetch, {
    path,
    read: (p) => fs.readFile(p),
    write: (p, data) => fs.writeFile(p, data)
  })

/**
 * Load (and if stale, refresh) the engine in the background. `onChange` fires when it becomes ready or fails; a
 * failure (offline, blocked …) is retried a few times with growing pauses.
 */
export function startAdEngine(onChange: (e: ElectronBlocker | null) => void): void {
  if (starting || engine) return
  starting = true
  const cache = join(app.getPath('userData'), 'adblock-engine.bin')
  void (async () => {
    try {
      const st = await fs.stat(cache).catch(() => null)
      let e: ElectronBlocker
      if (st && Date.now() - st.mtimeMs < MAX_AGE_MS) {
        e = await load(cache)
      } else {
        // Download into a side file so a failed refresh (offline) keeps the old lists usable.
        const fresh = cache + '.new'
        await fs.rm(fresh, { force: true })
        try {
          e = await load(fresh)
          await fs.rename(fresh, cache)
        } catch (err) {
          if (!st) throw err
          e = await load(cache)
        }
      }
      engine = e
      lastError = ''
      onChange(e)
    } catch (err) {
      starting = false
      lastError = err instanceof Error ? err.message : String(err)
      onChange(null)
      // offline / blocked: try again later instead of waiting for the next launch
      if (++attempts <= 5) setTimeout(() => startAdEngine(onChange), 60_000 * attempts).unref()
    }
  })()
}
