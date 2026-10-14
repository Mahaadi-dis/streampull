// Social-media account (profile) URLs, plus which sites may reuse the embedded browser's login.

export type AccountPlatform = 'tiktok' | 'instagram'

export interface ParsedAccountUrl {
  platform: AccountPlatform
  /** Profile root, e.g. https://www.tiktok.com/@name */
  base: string
  handle: string
}

// First path segments on instagram.com that are not profiles.
const IG_RESERVED = new Set([
  'p',
  'reel',
  'reels',
  'tv',
  'stories',
  'explore',
  'accounts',
  'direct',
  'about',
  'legal',
  'developers',
  'web',
  'api',
  'graphql',
  'oauth',
  'privacy',
  'press',
  'directory',
  'challenge',
  'emails',
  'session'
])

export function parseAccountUrl(url: string): ParsedAccountUrl | null {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return null
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
  const host = u.hostname.toLowerCase()
  const parts = u.pathname.split('/').filter(Boolean)

  if (/^(www\.|m\.)?tiktok\.com$/.test(host)) {
    // /@name — but not /@name/video/123 (that's a single video)
    if (parts.length === 1 && /^@[\w.]{1,48}$/.test(parts[0])) {
      return { platform: 'tiktok', base: `https://www.tiktok.com/${parts[0]}`, handle: parts[0].slice(1) }
    }
    return null
  }

  if (/^(www\.)?instagram\.com$/.test(host)) {
    if (parts.length === 1 && /^[A-Za-z0-9._]{1,30}$/.test(parts[0]) && !IG_RESERVED.has(parts[0].toLowerCase())) {
      return { platform: 'instagram', base: `https://www.instagram.com/${parts[0]}/`, handle: parts[0] }
    }
    return null
  }
  return null
}

/**
 * Sites where content commonly needs a login, so the embedded browser's session is reused
 * automatically (only cookies that belong to that URL are ever passed to yt-dlp).
 * YouTube is deliberately excluded: using account cookies there can get the account rate-limited.
 */
export function usesBrowserLogin(url: string): boolean {
  try {
    const h = new URL(url).hostname.toLowerCase()
    return /(^|\.)(instagram\.com|facebook\.com|fb\.watch|threads\.net|tiktok\.com|twitter\.com|x\.com)$/.test(h)
  } catch {
    return false
  }
}
