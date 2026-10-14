import { app } from 'electron'
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

export const getAdEngine = (): ElectronBlocker | null => engine

const load = (path: string): Promise<ElectronBlocker> =>
  ElectronBlocker.fromPrebuiltAdsAndTracking(fetch, {
    path,
    read: (p) => fs.readFile(p),
    write: (p, data) => fs.writeFile(p, data)
  })

/** Load (and if stale, refresh) the engine in the background. `onReady` fires once with the engine. */
export function startAdEngine(onReady: (e: ElectronBlocker) => void): void {
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
      onReady(e)
    } catch {
      starting = false // offline on first run: try again next time the browser opens
    }
  })()
}
