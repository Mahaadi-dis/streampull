import { describe, expect, it } from 'vitest'
import { parseAccountUrl, usesBrowserLogin } from './accounts'

describe('parseAccountUrl', () => {
  it('recognises TikTok profiles only', () => {
    expect(parseAccountUrl('https://www.tiktok.com/@tiktok')).toEqual({
      platform: 'tiktok',
      base: 'https://www.tiktok.com/@tiktok',
      handle: 'tiktok'
    })
    expect(parseAccountUrl('https://tiktok.com/@some.user_1/?lang=en')?.handle).toBe('some.user_1')
    expect(parseAccountUrl('https://www.tiktok.com/@tiktok/video/7694797676306615583')).toBeNull()
    expect(parseAccountUrl('https://www.tiktok.com/')).toBeNull()
  })
  it('recognises Instagram profiles, not posts or system pages', () => {
    expect(parseAccountUrl('https://www.instagram.com/instagram/')).toEqual({
      platform: 'instagram',
      base: 'https://www.instagram.com/instagram/',
      handle: 'instagram'
    })
    expect(parseAccountUrl('https://instagram.com/some.user?hl=en')?.handle).toBe('some.user')
    expect(parseAccountUrl('https://www.instagram.com/p/ABC123/')).toBeNull()
    expect(parseAccountUrl('https://www.instagram.com/reel/ABC123/')).toBeNull()
    expect(parseAccountUrl('https://www.instagram.com/explore/')).toBeNull()
    expect(parseAccountUrl('https://www.instagram.com/stories/user/123/')).toBeNull()
  })
  it('ignores everything else', () => {
    expect(parseAccountUrl('https://www.youtube.com/@Google')).toBeNull()
    expect(parseAccountUrl('nope')).toBeNull()
  })
})

describe('usesBrowserLogin', () => {
  it('opts in social sites only', () => {
    expect(usesBrowserLogin('https://www.instagram.com/x/')).toBe(true)
    expect(usesBrowserLogin('https://x.com/user/status/1')).toBe(true)
    expect(usesBrowserLogin('https://www.tiktok.com/@a')).toBe(true)
    expect(usesBrowserLogin('https://www.youtube.com/watch?v=a')).toBe(false)
    expect(usesBrowserLogin('https://notinstagram.com/')).toBe(false)
  })
})
