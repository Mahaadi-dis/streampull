// YouTube channel URLs and their content tabs (pure, shared by main and renderer).

export type ChannelTabId = 'videos' | 'shorts' | 'streams'

/** Tabs we know how to list, in display order. */
export const CHANNEL_TABS: readonly ChannelTabId[] = ['videos', 'shorts', 'streams']

export interface ChannelTab {
  id: ChannelTabId
  url: string
}

export interface ParsedChannelUrl {
  /** Channel root, e.g. https://www.youtube.com/@name */
  base: string
  /** The tab named in the URL, if any. */
  tab: ChannelTabId | null
}

// Path segments that can follow a channel handle. `live` is deliberately absent: /@name/live is a
// redirect to the *current* live video, not a list.
const KNOWN_SEGMENTS = new Set([
  'videos',
  'shorts',
  'streams',
  'featured',
  'playlists',
  'podcasts',
  'releases',
  'community',
  'about'
])

export function parseYoutubeChannelUrl(url: string): ParsedChannelUrl | null {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return null
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
  if (!/^(www\.|m\.)?youtube\.com$/i.test(u.hostname)) return null

  const parts = u.pathname.split('/').filter(Boolean)
  let consumed = 0
  if (parts[0]?.startsWith('@') && parts[0].length > 1) consumed = 1
  else if (['channel', 'c', 'user'].includes(parts[0]) && parts[1]) consumed = 2
  else return null

  const rest = parts.slice(consumed)
  if (rest.length > 1) return null
  const seg = rest[0]?.toLowerCase()
  if (seg && !KNOWN_SEGMENTS.has(seg)) return null

  const tab = (CHANNEL_TABS as readonly string[]).includes(seg ?? '') ? (seg as ChannelTabId) : null
  return { base: `https://www.youtube.com/${parts.slice(0, consumed).join('/')}`, tab }
}

export const channelTabUrl = (base: string, tab: ChannelTabId): string => `${base}/${tab}`
