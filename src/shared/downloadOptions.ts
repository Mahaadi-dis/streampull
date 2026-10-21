// Optional download features (cover art, tags, MP3 bitrate, subtitles, clip cutting) as pure yt-dlp argument logic, so
// it can be unit-tested and ported to the Android app (mobile/lib/core/download_options.dart) with the same vectors.
import type { QualityKey } from './types'

export type Mp3Quality = 'best' | '320' | '192' | '128'
export type SubtitleMode = 'off' | 'embed' | 'file'

export const MP3_QUALITIES: Mp3Quality[] = ['best', '320', '192', '128']
export const SUBTITLE_MODES: SubtitleMode[] = ['off', 'embed', 'file']
export const DEFAULT_SUBTITLE_LANGS = 'ar,en'

export const isMp3Quality = (v: unknown): v is Mp3Quality => MP3_QUALITIES.includes(v as Mp3Quality)
export const isSubtitleMode = (v: unknown): v is SubtitleMode => SUBTITLE_MODES.includes(v as SubtitleMode)

/** The settings that change what yt-dlp is asked to do. */
export interface DownloadPrefs {
  /** Put the video's thumbnail inside MP3/M4A files as their cover art. */
  embedCover: boolean
  /** Crop that cover to a square (players expect square covers; video thumbnails are 16:9). */
  squareCover: boolean
  /** Write title / artist / year tags into audio files. */
  embedTags: boolean
  mp3Quality: Mp3Quality
  subtitleMode: SubtitleMode
  /** Comma-separated language codes, e.g. "ar,en". */
  subtitleLangs: string
}

export const DEFAULT_PREFS: DownloadPrefs = {
  embedCover: true,
  squareCover: true,
  embedTags: true,
  mp3Quality: 'best',
  subtitleMode: 'off',
  subtitleLangs: DEFAULT_SUBTITLE_LANGS
}

/** A part of the video to keep, in seconds. */
export interface ClipRange {
  start: number
  end: number
}

/** yt-dlp's `--ppa` that crops the cover to a centered square before it is embedded. */
export const SQUARE_COVER_PPA =
  "ThumbnailsConvertor+FFmpeg_o:-c:v mjpeg -vf crop=\"'if(gt(ih,iw),iw,ih)':'if(gt(iw,ih),ih,iw)'\""

const isAudio = (q: QualityKey): boolean => q === 'mp3' || q === 'm4a'

/** `--audio-quality` value: 0 is the best variable bitrate, otherwise a fixed bitrate. */
export const mp3QualityArg = (q: Mp3Quality): string => (q === 'best' ? '0' : `${q}K`)

/**
 * Normalize "AR, en;fr-CA" → "ar,en,fr-CA" (lower-case primary codes). Returns null when nothing usable is left.
 * Only letters, digits, "-" and "_" survive, so the value can never smuggle yt-dlp options.
 */
export function cleanSubtitleLangs(input: string): string | null {
  const codes = input
    .split(/[\s,;]+/)
    .map((c) => c.trim())
    .filter((c) => /^[A-Za-z]{2,3}([-_][A-Za-z0-9]{2,8})*$/.test(c))
    .map((c) => {
      const [first, ...rest] = c.split(/[-_]/)
      return [first.toLowerCase(), ...rest].join('-')
    })
  const unique = [...new Set(codes)].slice(0, 8)
  return unique.length ? unique.join(',') : null
}

/** Parse "90", "1:30", "01:02:03" or "1:30.5" into seconds. Null when it isn't a time. */
export function parseClipTime(text: string): number | null {
  const t = text.trim()
  if (!/^\d+(\.\d+)?$|^(\d+:)?[0-5]?\d:[0-5]?\d(\.\d+)?$/.test(t)) return null
  const parts = t.split(':').map(Number)
  return parts.reduce((acc, p) => acc * 60 + p, 0)
}

/** 75 → "1:15", 3725 → "1:02:05". */
export function formatClipTime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const two = (n: number): string => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${two(m)}:${two(sec)}` : `${m}:${two(sec)}`
}

/** A usable clip: whole seconds, start before end, inside the video when its length is known. Null otherwise. */
export function validateClip(start: unknown, end: unknown, duration?: number | null): ClipRange | null {
  if (typeof start !== 'number' || typeof end !== 'number') return null
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  const s = Math.floor(start)
  const e = Math.ceil(end)
  if (s < 0 || e <= s) return null
  if (typeof duration === 'number' && duration > 0 && s >= duration) return null
  return { start: s, end: typeof duration === 'number' && duration > 0 ? Math.min(e, Math.ceil(duration)) : e }
}

/** A file-name suffix so two clips of the same video don't overwrite each other: " [clip 1-15 to 2-40]". */
export function clipSuffix(clip: ClipRange): string {
  const f = (n: number): string => formatClipTime(n).replace(/:/g, '-')
  return ` [clip ${f(clip.start)} to ${f(clip.end)}]`
}

/** The extra yt-dlp arguments for the optional features, for one download. */
export function downloadOptionArgs(quality: QualityKey, prefs: DownloadPrefs, clip?: ClipRange | null): string[] {
  const args: string[] = []
  if (isAudio(quality)) {
    if (prefs.embedCover) {
      args.push('--embed-thumbnail', '--convert-thumbnails', 'jpg')
      if (prefs.squareCover) args.push('--ppa', SQUARE_COVER_PPA)
    }
    if (prefs.embedTags) args.push('--embed-metadata')
  } else if (prefs.subtitleMode !== 'off') {
    const langs = cleanSubtitleLangs(prefs.subtitleLangs) ?? DEFAULT_SUBTITLE_LANGS
    args.push('--write-subs', '--write-auto-subs', '--sub-langs', langs)
    if (prefs.subtitleMode === 'embed') args.push('--embed-subs')
    else args.push('--convert-subs', 'srt')
  }
  if (clip) args.push('--download-sections', `*${clip.start}-${clip.end}`, '--force-keyframes-at-cuts')
  return args
}
