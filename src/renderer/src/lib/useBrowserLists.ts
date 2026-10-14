import { useCallback, useEffect, useState } from 'react'
import type { Bookmark, Visit } from '@shared/bookmarks'

/** Bookmarks + browsing history for the browser UI. `refreshKey` changes whenever a page was visited. */
export function useBrowserLists(refreshKey: unknown = null): {
  bookmarks: Bookmark[]
  visits: Visit[]
  toggleBookmark: (url: string, title: string) => Promise<void>
  removeBookmark: (id: string) => Promise<void>
  removeVisit: (url: string) => Promise<void>
  clearVisits: () => Promise<void>
} {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [visits, setVisits] = useState<Visit[]>([])

  useEffect(() => {
    let live = true
    void Promise.all([window.api.bookmarksList(), window.api.visitsList()]).then(([b, v]) => {
      if (!live) return
      setBookmarks(b)
      setVisits(v)
    })
    return () => {
      live = false
    }
  }, [refreshKey])

  const toggleBookmark = useCallback(async (url: string, title: string) => {
    setBookmarks(await window.api.bookmarkToggle(url, title))
  }, [])
  const removeBookmark = useCallback(async (id: string) => {
    setBookmarks(await window.api.bookmarkRemove(id))
  }, [])
  const removeVisit = useCallback(async (url: string) => {
    setVisits(await window.api.visitRemove(url))
  }, [])
  const clearVisits = useCallback(async () => {
    await window.api.visitsClear()
    setVisits([])
  }, [])

  return { bookmarks, visits, toggleBookmark, removeBookmark, removeVisit, clearVisits }
}
