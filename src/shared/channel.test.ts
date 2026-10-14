import { describe, expect, it } from 'vitest'
import { channelTabUrl, parseYoutubeChannelUrl } from './channel'

describe('parseYoutubeChannelUrl', () => {
  it('recognises handles, with and without a tab', () => {
    expect(parseYoutubeChannelUrl('https://www.youtube.com/@Google')).toEqual({
      base: 'https://www.youtube.com/@Google',
      tab: null
    })
    expect(parseYoutubeChannelUrl('https://youtube.com/@Google/shorts')).toEqual({
      base: 'https://www.youtube.com/@Google',
      tab: 'shorts'
    })
    expect(parseYoutubeChannelUrl('https://m.youtube.com/@Google/streams/?x=1')?.tab).toBe('streams')
    expect(parseYoutubeChannelUrl('https://www.youtube.com/@Google/featured')?.tab).toBeNull()
  })
  it('recognises /channel, /c and /user forms', () => {
    expect(parseYoutubeChannelUrl('https://www.youtube.com/channel/UCK8sQmJBp8GCxrOtXWBpyEA/videos')).toEqual({
      base: 'https://www.youtube.com/channel/UCK8sQmJBp8GCxrOtXWBpyEA',
      tab: 'videos'
    })
    expect(parseYoutubeChannelUrl('https://www.youtube.com/c/Google')?.base).toBe('https://www.youtube.com/c/Google')
    expect(parseYoutubeChannelUrl('https://www.youtube.com/user/google')?.base).toBe('https://www.youtube.com/user/google')
  })
  it('ignores videos, playlists, live redirects and other sites', () => {
    expect(parseYoutubeChannelUrl('https://www.youtube.com/watch?v=abc')).toBeNull()
    expect(parseYoutubeChannelUrl('https://www.youtube.com/playlist?list=PL1')).toBeNull()
    expect(parseYoutubeChannelUrl('https://www.youtube.com/@Google/live')).toBeNull()
    expect(parseYoutubeChannelUrl('https://www.youtube.com/shorts/abc')).toBeNull()
    expect(parseYoutubeChannelUrl('https://vimeo.com/@x')).toBeNull()
    expect(parseYoutubeChannelUrl('not a url')).toBeNull()
  })
  it('builds tab urls', () => {
    expect(channelTabUrl('https://www.youtube.com/@Google', 'shorts')).toBe('https://www.youtube.com/@Google/shorts')
  })
})
