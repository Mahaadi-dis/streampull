import { describe, expect, it } from 'vitest'
import { isAdHost, isAdRequest } from './adblock'

describe('isAdHost', () => {
  it('matches listed hosts and their subdomains', () => {
    expect(isAdHost('doubleclick.net')).toBe(true)
    expect(isAdHost('securepubads.g.doubleclick.net')).toBe(true)
    expect(isAdHost('ADS.TIKTOK.COM')).toBe(true)
  })
  it('does not match lookalikes or normal sites', () => {
    expect(isAdHost('notdoubleclick.net')).toBe(false)
    expect(isAdHost('example.com')).toBe(false)
    expect(isAdHost('tiktok.com')).toBe(false)
    expect(isAdHost('localhost')).toBe(false)
  })
})

describe('isAdRequest', () => {
  it('blocks third-party ad hosts', () => {
    expect(isAdRequest('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', 'https://news.example/')).toBe(true)
    expect(isAdRequest('https://cdn.taboola.com/x.js', 'https://news.example/a')).toBe(true)
  })
  it('blocks ad endpoints on legitimate hosts only by path', () => {
    expect(isAdRequest('https://www.youtube.com/api/stats/ads?x=1', 'https://www.youtube.com/watch?v=1')).toBe(true)
    expect(isAdRequest('https://www.youtube.com/youtubei/v1/player', 'https://www.youtube.com/watch?v=1')).toBe(false)
    expect(isAdRequest('https://rr1---sn.googlevideo.com/videoplayback?x=1', 'https://www.youtube.com/watch?v=1')).toBe(false)
  })
  it('never blocks the page’s own site', () => {
    expect(isAdRequest('https://www.taboola.com/app.js', 'https://www.taboola.com/')).toBe(false)
    expect(isAdRequest('https://x.taboola.com/app.js', 'https://taboola.com/')).toBe(false)
  })
  it('ignores non-http(s) and bad urls', () => {
    expect(isAdRequest('data:text/plain,hi')).toBe(false)
    expect(isAdRequest('not a url')).toBe(false)
  })
})
