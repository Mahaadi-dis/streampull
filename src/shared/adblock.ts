import hosts from './assets/adblock-hosts.json'

/**
 * A small, conservative ad blocker: it cancels requests to well-known ad-serving hosts (plus a few ad endpoints
 * on otherwise legitimate hosts). Ads are the main reason sniffing picks up junk and pages stall, so this keeps
 * the embedded browser quick and the media list clean. The host list lives in
 * `assets/adblock-hosts.json`.
 */

const BLOCKED = new Set<string>(hosts)

/** [host suffix, path prefix] — ad endpoints that live on hosts we must not block as a whole. */
const PATH_RULES: [string, string][] = [
  ['youtube.com', '/api/stats/ads'],
  ['youtube.com', '/pagead/'],
  ['youtube.com', '/ptracking'],
  ['youtube.com', '/get_midroll_'],
  ['google.com', '/pagead/'],
  ['google.com', '/adsense/']
]

const hostMatches = (host: string, suffix: string): boolean => host === suffix || host.endsWith('.' + suffix)

/** True when the host, or any parent domain of it, is a known ad host. */
export function isAdHost(host: string): boolean {
  let h = host.toLowerCase().replace(/\.$/, '')
  while (h.includes('.')) {
    if (BLOCKED.has(h)) return true
    h = h.slice(h.indexOf('.') + 1)
  }
  return false
}

/**
 * Should this request be cancelled? `pageUrl` is the page that made it: ad-host requests to the page's own site are
 * never blocked (so visiting an ad network's own site still works), and top-level navigations are the
 * caller's business, not ours.
 */
export function isAdRequest(url: string, pageUrl = ''): boolean {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return false
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false
  const host = u.hostname.toLowerCase()
  // Ad endpoints on a legitimate site are blocked even when the page is on that site.
  if (PATH_RULES.some(([h, p]) => hostMatches(host, h) && u.pathname.startsWith(p))) return true
  if (!isAdHost(host)) return false
  if (pageUrl) {
    try {
      const pageHost = new URL(pageUrl).hostname.toLowerCase()
      if (hostMatches(pageHost, host) || hostMatches(host, pageHost)) return false
    } catch {
      /* unknown page */
    }
  }
  return true
}
