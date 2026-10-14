import { describe, expect, it } from 'vitest'
import { isBookmarked, normalizeUrl, recordVisit, retitleVisit, suggest, toggleBookmark, type Bookmark, type Visit } from './bookmarks'

describe('normalizeUrl', () => {
  it('ignores fragment and a bare trailing slash', () => {
    expect(normalizeUrl('https://a.com/#x')).toBe('https://a.com')
    expect(normalizeUrl('https://a.com/p/#x')).toBe('https://a.com/p/')
    expect(normalizeUrl('https://a.com/?q=1')).toBe('https://a.com/?q=1')
  })
})

describe('toggleBookmark', () => {
  it('adds then removes the same page', () => {
    const a = toggleBookmark([], 'https://a.com/', 'A', 1, 'x')
    expect(a).toHaveLength(1)
    expect(isBookmarked(a, 'https://a.com#frag')).toBe(true)
    expect(toggleBookmark(a, 'https://a.com', 'A', 2, 'y')).toHaveLength(0)
  })
  it('falls back to the host when there is no title and refuses non-web pages', () => {
    expect(toggleBookmark([], 'https://www.a.com/p', '  ', 1, 'x')[0].title).toBe('a.com')
    expect(toggleBookmark([], 'about:blank', 'x', 1, 'x')).toHaveLength(0)
  })
})

describe('recordVisit', () => {
  it('counts repeat visits, moves them to the front and keeps the last good title', () => {
    let v: Visit[] = []
    v = recordVisit(v, 'https://a.com/1', 'One', 1)
    v = recordVisit(v, 'https://b.com/', 'B', 2)
    v = recordVisit(v, 'https://a.com/1#top', '', 3)
    expect(v.map((x) => x.url)).toEqual(['https://a.com/1#top', 'https://b.com/'])
    expect(v[0]).toMatchObject({ title: 'One', visits: 2, visitedAt: 3 })
  })
  it('ignores non-web pages', () => {
    expect(recordVisit([], 'about:blank', 'x', 1)).toHaveLength(0)
  })
  it('retitle changes the title only', () => {
    const v = retitleVisit(recordVisit([], 'https://a.com/', 'a.com', 1), 'https://a.com', 'Real title')
    expect(v[0]).toMatchObject({ title: 'Real title', visits: 1 })
  })
})

describe('suggest', () => {
  const bms: Bookmark[] = [{ id: '1', url: 'https://youtube.com/', title: 'YouTube', addedAt: 1 }]
  const vis: Visit[] = [
    { url: 'https://youtube.com/', title: 'YouTube', visitedAt: 5, visits: 9 },
    { url: 'https://you.example/', title: 'Example', visitedAt: 9, visits: 1 },
    { url: 'https://other.com/', title: 'Other', visitedAt: 9, visits: 4 }
  ]
  it('puts bookmarks first and de-duplicates', () => {
    const s = suggest(bms, vis, 'you')
    expect(s.map((x) => [x.kind, x.url])).toEqual([
      ['bookmark', 'https://youtube.com/'],
      ['history', 'https://you.example/']
    ])
  })
  it('returns nothing for an empty query', () => {
    expect(suggest(bms, vis, '  ')).toEqual([])
  })
})
