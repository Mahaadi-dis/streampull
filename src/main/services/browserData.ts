import { randomUUID } from 'crypto'
import {
  recordVisit,
  retitleVisit,
  toggleBookmark,
  normalizeUrl,
  type Bookmark,
  type Visit
} from '@shared/bookmarks'
import { JsonStore } from './jsonStore'

let bookmarks: JsonStore<Bookmark[]>
let visits: JsonStore<Visit[]>

export function initBrowserData(): void {
  bookmarks = new JsonStore<Bookmark[]>('bookmarks', [])
  visits = new JsonStore<Visit[]>('browsing-history', [])
}

export const listBookmarks = (): Bookmark[] => bookmarks.data

export function toggleBookmarkFor(url: string, title: string): Bookmark[] {
  bookmarks.data = toggleBookmark(bookmarks.data, url, title, Date.now(), randomUUID())
  bookmarks.save()
  return bookmarks.data
}

export function removeBookmark(id: string): Bookmark[] {
  bookmarks.data = bookmarks.data.filter((b) => b.id !== id)
  bookmarks.save()
  return bookmarks.data
}

export const listVisits = (): Visit[] => visits.data

export function addVisit(url: string, title: string): void {
  visits.data = recordVisit(visits.data, url, title, Date.now())
  visits.save()
}

export function setVisitTitle(url: string, title: string): void {
  const next = retitleVisit(visits.data, url, title)
  if (next === visits.data) return
  visits.data = next
  visits.save()
}

export function removeVisit(url: string): Visit[] {
  const n = normalizeUrl(url)
  visits.data = visits.data.filter((v) => normalizeUrl(v.url) !== n)
  visits.save()
  return visits.data
}

export function clearVisits(): void {
  visits.data = []
  visits.save()
}

export const flushBrowserData = (): void => {
  bookmarks?.flush()
  visits?.flush()
}
