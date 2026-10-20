import { describe, expect, it } from 'vitest'
import { videoPageSite } from './pageVideo'

describe('videoPageSite', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'YouTube'],
    ['https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=10', 'YouTube'],
    ['https://youtu.be/jNQXAC9IVRw', 'YouTube'],
    ['https://www.youtube.com/shorts/abcDEF123', 'YouTube'],
    ['https://www.tiktok.com/@user/video/7300000000000000000', 'TikTok'],
    ['https://vm.tiktok.com/ZMabc123/', 'TikTok'],
    ['https://www.instagram.com/reel/C0abcDEF12/', 'Instagram'],
    ['https://www.instagram.com/p/C0abcDEF12/', 'Instagram'],
    ['https://x.com/someone/status/1700000000000000000', 'X'],
    ['https://twitter.com/someone/status/1700000000000000000', 'X'],
    ['https://www.facebook.com/watch/?v=123456789', 'Facebook'],
    ['https://www.facebook.com/somepage/videos/123456789', 'Facebook'],
    ['https://fb.watch/abc123/', 'Facebook'],
    ['https://vimeo.com/76979871', 'Vimeo'],
    ['https://www.dailymotion.com/video/x8abcde', 'Dailymotion'],
    ['https://www.twitch.tv/videos/1234567890', 'Twitch'],
    ['https://clips.twitch.tv/FunnySlugName-abc', 'Twitch'],
    ['https://soundcloud.com/artist/some-track', 'SoundCloud']
  ])('recognises %s', (url, site) => {
    expect(videoPageSite(url)).toBe(site)
  })

  it.each([
    'https://www.youtube.com/',
    'https://www.youtube.com/@somechannel',
    'https://www.youtube.com/results?search_query=cats',
    'https://www.tiktok.com/@user',
    'https://www.instagram.com/someuser/',
    'https://x.com/home',
    'https://vimeo.com/',
    'https://soundcloud.com/discover/sets',
    'https://example.com/watch?v=1',
    'about:blank',
    'not a url'
  ])('ignores %s', (url) => {
    expect(videoPageSite(url)).toBeNull()
  })
})
