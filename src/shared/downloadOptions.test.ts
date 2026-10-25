import { describe, expect, it } from 'vitest'
import { DEFAULT_PREFS, SQUARE_COVER_PPA, downloadOptionArgs, mp3QualityArg } from './downloadOptions'
import { formatArgs } from './ytdlpArgs'

describe('audio options', () => {
  it('embeds a square cover and tags by default', () => {
    expect(downloadOptionArgs('mp3', DEFAULT_PREFS)).toEqual([
      '--embed-thumbnail',
      '--convert-thumbnails',
      'jpg',
      '--ppa',
      SQUARE_COVER_PPA,
      '--embed-metadata'
    ])
  })

  it('skips the crop when the cover should stay as it is', () => {
    const a = downloadOptionArgs('m4a', { ...DEFAULT_PREFS, squareCover: false })
    expect(a).toContain('--embed-thumbnail')
    expect(a).not.toContain('--ppa')
  })

  it('does nothing when the toggles are off', () => {
    expect(downloadOptionArgs('mp3', { ...DEFAULT_PREFS, embedCover: false, embedTags: false })).toEqual([])
  })

  it('never adds audio options to a video download', () => {
    expect(downloadOptionArgs('1080', DEFAULT_PREFS)).toEqual([])
    expect(downloadOptionArgs('best', DEFAULT_PREFS)).toEqual([])
  })
})

describe('mp3 bitrate', () => {
  it('maps the setting to yt-dlp', () => {
    expect(mp3QualityArg('best')).toBe('0')
    expect(mp3QualityArg('320')).toBe('320K')
    expect(mp3QualityArg('128')).toBe('128K')
  })

  it('is used by formatArgs for mp3 only', () => {
    expect(formatArgs('mp3')).toEqual(['-f', 'ba/b', '-x', '--audio-format', 'mp3', '--audio-quality', '0'])
    expect(formatArgs('mp3', '192')).toEqual(['-f', 'ba/b', '-x', '--audio-format', 'mp3', '--audio-quality', '192K'])
    expect(formatArgs('m4a', '128')).toEqual(['-f', 'ba[ext=m4a]/ba/b', '-x', '--audio-format', 'm4a'])
  })
})
