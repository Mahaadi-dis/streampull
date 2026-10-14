/** Pure helpers for the browser's bookmarks and browsing history (storage lives in each platform's own layer). */

export interface Bookmark {
  id: string
  url: string
  title: string
  addedAt: number
}

export interface Visit {
  url: string
  title: string
  visitedAt: number
  visits: number
}

export const MAX_VISITS = 1500

/** Two URLs that differ only by a trailing slash or a #fragment are the same page for bookmarking/history. */
export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url)
    u.hash = ''
    let s = u.toString()
    if (s.endsWith('/') && u.pathname === '/' && !u.search) s = s.slice(0, -1)
    return s
  } catch {
    return url.trim()
  }
}

/** Only real web pages are remembered (not about:blank, data:, file: …). */
export const isRememberable = (url: string): boolean => /^https?:\/\//i.test(url)

export const isBookmarked = (list: Bookmark[], url: string): boolean => {
  const n = normalizeUrl(url)
  return list.some((b) => normalizeUrl(b.url) === n)
}

/** Add the page, or remove it when it is already bookmarked. */
export function toggleBookmark(list: Bookmark[], url: string, title: string, now: number, id: string): Bookmark[] {
  const n = normalizeUrl(url)
  if (list.some((b) => normalizeUrl(b.url) === n)) return list.filter((b) => normalizeUrl(b.url) !== n)
  if (!isRememberable(url)) return list
  return [{ id, url, title: title.trim() || hostOf(url), addedAt: now }, ...list]
}

/** Record a page view: bump the existing entry (and refresh its title) or add a new one; newest first. */
export function recordVisit(list: Visit[], url: string, title: string, now: number): Visit[] {
  if (!isRememberable(url)) return list
  const n = normalizeUrl(url)
  const prev = list.find((v) => normalizeUrl(v.url) === n)
  const entry: Visit = {
    url,
    title: title.trim() || prev?.title || hostOf(url),
    visitedAt: now,
    visits: (prev?.visits ?? 0) + 1
  }
  return [entry, ...list.filter((v) => v !== prev)].slice(0, MAX_VISITS)
}

/** A title can arrive after the page loads: update it without counting another visit. */
export function retitleVisit(list: Visit[], url: string, title: string): Visit[] {
  const n = normalizeUrl(url)
  const t = title.trim()
  if (!t) return list
  return list.map((v) => (normalizeUrl(v.url) === n && v.title !== t ? { ...v, title: t } : v))
}

export interface Suggestion {
  url: string
  title: string
  kind: 'bookmark' | 'history'
}

/** Address-bar suggestions: bookmarks first, then frequently/recently visited pages. */
export function suggest(bookmarks: Bookmark[], visits: Visit[], query: string, limit = 6): Suggestion[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const hit = (url: string, title: string): boolean => url.toLowerCase().includes(q) || title.toLowerCase().includes(q)
  const out: Suggestion[] = []
  const seen = new Set<string>()
  const push = (s: Suggestion): void => {
    const n = normalizeUrl(s.url)
    if (seen.has(n) || out.length >= limit) return
    seen.add(n)
    out.push(s)
  }
  for (const b of bookmarks) if (hit(b.url, b.title)) push({ url: b.url, title: b.title, kind: 'bookmark' })
  const ranked = visits.filter((v) => hit(v.url, v.title)).sort((a, b) => b.visits - a.visits || b.visitedAt - a.visitedAt)
  for (const v of ranked) push({ url: v.url, title: v.title, kind: 'history' })
  return out
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
