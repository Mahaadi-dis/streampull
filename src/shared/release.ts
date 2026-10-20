import type { UpdateInfo } from './types'
import { isNewerVersion } from './version'

/** The answer to "is there a newer version?", with the cases a person needs to tell apart. */
export type UpdateCheck =
  | { status: 'newer'; info: UpdateInfo }
  /** The running version is the latest published release (or newer, e.g. a development build). */
  | { status: 'latest'; version: string }
  /** Offline, rate-limited, or an unreadable answer. */
  | { status: 'error' }

/**
 * Interpret GitHub's "latest release" response. Pre-releases and drafts do not count. The link only ever points at
 * this project's own releases, whatever the response says.
 */
export function evaluateRelease(json: unknown, current: string, repo: string): UpdateCheck {
  if (typeof json !== 'object' || json === null) return { status: 'error' }
  const r = json as { tag_name?: unknown; html_url?: unknown; draft?: unknown; prerelease?: unknown }
  const tag = typeof r.tag_name === 'string' ? r.tag_name : ''
  if (!tag) return { status: 'error' }
  const version = tag.replace(/^v/, '')
  if (r.draft === true || r.prerelease === true || !isNewerVersion(tag, current)) return { status: 'latest', version }
  const url =
    typeof r.html_url === 'string' && r.html_url.startsWith(`https://github.com/${repo}/`)
      ? r.html_url
      : `https://github.com/${repo}/releases`
  return { status: 'newer', info: { version, current, url } }
}
