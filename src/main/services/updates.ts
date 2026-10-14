import { app } from 'electron'
import type { UpdateInfo } from '@shared/types'
import { isNewerVersion } from '@shared/version'

const REPO = 'Mahaadi-dis/streampull'
const RELEASES_API = `https://api.github.com/repos/${REPO}/releases/latest`
const RELEASES_PAGE = `https://github.com/${REPO}/releases`

/**
 * Ask GitHub for the latest published release. Returns it when it is newer than the running app, else null
 * (also on any network error — update checks must never get in the way). Nothing is downloaded or installed:
 * the UI just links to the release page.
 */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  try {
    const res = await fetch(RELEASES_API, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': `StreamPull/${app.getVersion()}` },
      signal: AbortSignal.timeout(10_000)
    })
    if (!res.ok) return null
    const json = (await res.json()) as { tag_name?: unknown; html_url?: unknown; draft?: unknown; prerelease?: unknown }
    const tag = typeof json.tag_name === 'string' ? json.tag_name : ''
    if (json.draft === true || json.prerelease === true) return null
    const current = app.getVersion()
    if (!isNewerVersion(tag, current)) return null
    // Only ever link to this project's own releases, whatever the response says.
    const url =
      typeof json.html_url === 'string' && json.html_url.startsWith(`https://github.com/${REPO}/`)
        ? json.html_url
        : RELEASES_PAGE
    return { version: tag.replace(/^v/, ''), current, url }
  } catch {
    return null
  }
}
