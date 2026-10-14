import { describe, expect, it } from 'vitest'
import {
  buildQualityOptions,
  classifyError,
  formatArgs,
  isValidUrl,
  mapInfo,
  parseFileLine,
  parseProgressLine,
  wantsSingle
} from './ytdlpArgs'

describe('formatArgs', () => {
  it('caps height and merges to mp4', () => {
    const a = formatArgs('720')
    expect(a[1]).toBe('bv*[height<=720]+ba/b[height<=720]/b')
    expect(a).toContain('mp4')
  })
  it('best has no height filter', () => {
    expect(formatArgs('best')[1]).toBe('bv*+ba/b/b')
  })
  it('extracts audio for mp3', () => {
    const a = formatArgs('mp3')
    expect(a).toContain('-x')
    expect(a).toContain('mp3')
  })
})

describe('parseProgressLine', () => {
  it('parses a normal line', () => {
    const p = parseProgressLine('VGP|500|1000|NA|2048.5|10')!
    expect(p.percent).toBe(50)
    expect(p.speed).toBe(2048.5)
    expect(p.eta).toBe(10)
  })
  it('falls back to estimate and tolerates NA', () => {
    const p = parseProgressLine('VGP|250|NA|1000|NA|NA')!
    expect(p.totalBytes).toBe(1000)
    expect(p.percent).toBe(25)
    expect(p.speed).toBeNull()
  })
  it('ignores other lines', () => {
    expect(parseProgressLine('[youtube] hello')).toBeNull()
    expect(parseProgressLine('VGPP|started')).toBeNull()
  })
})

describe('misc', () => {
  it('parses file line', () => {
    expect(parseFileLine('VGFILE|C:\\a\\b.mp4\r')).toBe('C:\\a\\b.mp4')
  })
  it('classifies errors', () => {
    expect(classifyError('ERROR: Unsupported URL: x')).toBe('unsupported')
    expect(classifyError('ERROR: Private video. Sign in')).toBe('private')
    expect(classifyError('getaddrinfo failed')).toBe('network')
    expect(classifyError('ERROR: [instagram:user] instagram: Unable to extract data; please report this issue')).toBe(
      'login_required'
    )
    expect(classifyError('boom')).toBe('unknown')
  })
  it('validates urls', () => {
    expect(isValidUrl('https://a.com/x')).toBe(true)
    expect(isValidUrl('file:///c:/x')).toBe(false)
    expect(isValidUrl('nope')).toBe(false)
  })
  it('detects single video inside playlist url', () => {
    expect(wantsSingle('https://www.youtube.com/watch?v=abc&list=PL1')).toBe(true)
    expect(wantsSingle('https://www.youtube.com/playlist?list=PL1')).toBe(false)
  })
})

describe('buildQualityOptions', () => {
  it('builds a ladder with sizes', () => {
    const o = buildQualityOptions([
      { height: 1080, vcodec: 'avc1', acodec: 'none', filesize: 100 },
      { height: 720, vcodec: 'avc1', acodec: 'none', filesize: 60 },
      { vcodec: 'none', acodec: 'mp4a', filesize: 10 }
    ])
    expect(o.map((x) => x.key)).toEqual(['best', '1080', '720', 'mp3', 'm4a'])
    expect(o[1].sizeBytes).toBe(110)
  })
  it('falls back when no formats', () => {
    expect(buildQualityOptions(undefined).length).toBeGreaterThan(3)
  })
})

describe('mapInfo', () => {
  it('maps a playlist', () => {
    const i = mapInfo('https://x/p', {
      _type: 'playlist',
      title: 'P',
      entries: [{ id: 'a', title: 'A', url: 'https://x/a' }, null, { id: 'b', url: 'bad' }]
    })
    expect(i.isPlaylist).toBe(true)
    expect(i.entries).toHaveLength(1)
  })
})

describe('channels', () => {
  it('finds the tabs a channel has from the root listing', async () => {
    const { channelTabsFromRoot } = await import('./ytdlpArgs')
    const base = 'https://www.youtube.com/@x'
    const tabs = channelTabsFromRoot(
      {
        entries: [
          { _type: 'playlist', webpage_url: `${base}/videos` },
          { _type: 'playlist', webpage_url: `${base}/streams` },
          { _type: 'playlist', webpage_url: `${base}/shorts` },
          { _type: 'playlist', webpage_url: `${base}/playlists` }
        ]
      },
      base
    )
    expect(tabs.map((t) => t.id)).toEqual(['videos', 'shorts', 'streams']) // display order
    expect(tabs[1].url).toBe(`${base}/shorts`)
  })
  it('treats a root that lists videos directly as a videos-only channel', async () => {
    const { channelTabsFromRoot } = await import('./ytdlpArgs')
    const base = 'https://www.youtube.com/@solo'
    expect(channelTabsFromRoot({ entries: [{ _type: 'url', url: 'https://www.youtube.com/watch?v=a' }] }, base)).toEqual([
      { id: 'videos', url: `${base}/videos` }
    ])
  })
  it('picks a square avatar and shrinks it', async () => {
    const { channelAvatar } = await import('./ytdlpArgs')
    expect(
      channelAvatar([
        { id: 'banner_uncropped', url: 'https://x/banner=s0' },
        { id: 'avatar_uncropped', url: 'https://yt3.googleusercontent.com/abc=s0' }
      ])
    ).toBe('https://yt3.googleusercontent.com/abc=s176-c')
    expect(channelAvatar(undefined)).toBeNull()
  })
  it('flags live and upcoming entries', () => {
    const i = mapInfo('https://x/p', {
      _type: 'playlist',
      title: 'C',
      entries: [
        { id: 'a', title: 'A', url: 'https://x/a', live_status: 'is_live' },
        { id: 'b', title: 'B', url: 'https://x/b', live_status: 'is_upcoming' },
        { id: 'c', title: 'C', url: 'https://x/c', live_status: 'was_live' }
      ]
    })
    expect(i.entries.map((e) => e.liveStatus)).toEqual(['live', 'upcoming', null])
  })
})

describe('toBrowserUrl', () => {
  it('turns address-bar input into a URL or a search', async () => {
    const { toBrowserUrl } = await import('./ytdlpArgs')
    expect(toBrowserUrl('https://a.com/x')).toBe('https://a.com/x')
    expect(toBrowserUrl('example.com/page')).toBe('https://example.com/page')
    expect(toBrowserUrl('cat videos')).toBe('https://duckduckgo.com/?q=cat%20videos')
  })
})
