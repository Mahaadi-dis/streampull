import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PREFS,
  SQUARE_COVER_PPA,
  clipSuffix,
  cleanSubtitleLangs,
  downloadOptionArgs,
  formatClipTime,
  mp3QualityArg,
  parseClipTime,
  validateClip
} from './downloadOptions'
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

  it('never adds cover or subtitle options to the wrong kind of download', () => {
    const prefs = { ...DEFAULT_PREFS, subtitleMode: 'embed' as const }
    expect(downloadOptionArgs('mp3', prefs)).not.toContain('--embed-subs')
    expect(downloadOptionArgs('1080', prefs)).not.toContain('--embed-thumbnail')
    expect(downloadOptionArgs('1080', prefs)).not.toContain('--embed-metadata')
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

describe('subtitles', () => {
  it('is off by default', () => {
    expect(downloadOptionArgs('1080', DEFAULT_PREFS)).toEqual([])
  })

  it('embeds into the video', () => {
    expect(downloadOptionArgs('1080', { ...DEFAULT_PREFS, subtitleMode: 'embed' })).toEqual([
      '--write-subs',
      '--write-auto-subs',
      '--sub-langs',
      'ar,en',
      '--embed-subs'
    ])
  })

  it('saves a separate .srt file', () => {
    expect(downloadOptionArgs('best', { ...DEFAULT_PREFS, subtitleMode: 'file', subtitleLangs: 'fr' })).toEqual([
      '--write-subs',
      '--write-auto-subs',
      '--sub-langs',
      'fr',
      '--convert-subs',
      'srt'
    ])
  })

  it('cleans the language list', () => {
    expect(cleanSubtitleLangs('AR, en;fr-CA  ar')).toBe('ar,en,fr-CA')
    expect(cleanSubtitleLangs('en --exec "x;y"')).toBe('en')
    expect(cleanSubtitleLangs('--exec')).toBeNull()
    expect(cleanSubtitleLangs('')).toBeNull()
  })

  it('falls back to the default languages when the list is unusable', () => {
    const a = downloadOptionArgs('720', { ...DEFAULT_PREFS, subtitleMode: 'file', subtitleLangs: '!!!' })
    expect(a[a.indexOf('--sub-langs') + 1]).toBe('ar,en')
  })
})

describe('clips', () => {
  it('parses times', () => {
    expect(parseClipTime('90')).toBe(90)
    expect(parseClipTime('1:30')).toBe(90)
    expect(parseClipTime('01:02:03')).toBe(3723)
    expect(parseClipTime('1:30.5')).toBe(90.5)
    expect(parseClipTime(' 0:05 ')).toBe(5)
  })

  it('rejects anything that is not a time', () => {
    for (const t of ['', 'abc', '1:60', '-5', '1:2:3:4', '1:30 --exec', '1,5']) expect(parseClipTime(t)).toBeNull()
  })

  it('formats times', () => {
    expect(formatClipTime(75)).toBe('1:15')
    expect(formatClipTime(5)).toBe('0:05')
    expect(formatClipTime(3725)).toBe('1:02:05')
  })

  it('validates a range against the video length', () => {
    expect(validateClip(10, 20)).toEqual({ start: 10, end: 20 })
    expect(validateClip(10.4, 20.2)).toEqual({ start: 10, end: 21 })
    expect(validateClip(10, 200, 60)).toEqual({ start: 10, end: 60 })
    expect(validateClip(70, 80, 60)).toBeNull()
    expect(validateClip(20, 10)).toBeNull()
    expect(validateClip(5, 5)).toBeNull()
    expect(validateClip(-1, 5)).toBeNull()
    expect(validateClip('1', 5)).toBeNull()
    expect(validateClip(0, Number.POSITIVE_INFINITY)).toBeNull()
  })

  it('cuts the section and keeps the cut accurate', () => {
    expect(downloadOptionArgs('1080', DEFAULT_PREFS, { start: 60, end: 150 })).toEqual([
      '--download-sections',
      '*60-150',
      '--force-keyframes-at-cuts'
    ])
  })

  it('works for audio too, next to the cover options', () => {
    const a = downloadOptionArgs('mp3', DEFAULT_PREFS, { start: 0, end: 30 })
    expect(a).toContain('--embed-thumbnail')
    expect(a.slice(-3)).toEqual(['--download-sections', '*0-30', '--force-keyframes-at-cuts'])
  })

  it('makes a file-name suffix that is safe on Windows', () => {
    expect(clipSuffix({ start: 75, end: 3725 })).toBe(' [clip 1-15 to 1-02-05]')
    expect(clipSuffix({ start: 0, end: 30 })).not.toMatch(/[<>:"/\\|?*]/)
  })
})
