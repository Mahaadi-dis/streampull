import { app, net } from 'electron'
import type { UpdateInfo } from '@shared/types'
import { evaluateRelease, type UpdateCheck } from '@shared/release'

const REPO = 'Mahaadi-dis/streampull'
const RELEASES_API = `https://api.github.com/repos/${REPO}/releases/latest`

/**
 * Ask GitHub for the latest published release and say what that means for the running app. Nothing is downloaded
 * or installed: the UI just links to the release page. Never throws.
 */
export async function checkForUpdateNow(): Promise<UpdateCheck> {
  try {
    const res = await net.fetch(RELEASES_API, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': `StreamPull/${app.getVersion()}` },
      signal: AbortSignal.timeout(10_000)
    })
    if (!res.ok) return { status: 'error' }
    return evaluateRelease(await res.json(), app.getVersion(), REPO)
  } catch {
    return { status: 'error' }
  }
}

/** The background check: the newer release, or null when up to date, offline or anything fails. */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  const r = await checkForUpdateNow()
  return r.status === 'newer' ? r.info : null
}
