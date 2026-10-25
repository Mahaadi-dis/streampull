// Optional audio features (cover art, tags, MP3 bitrate) as pure yt-dlp argument logic, so it can be unit-tested and
// ported to the Android app (mobile/lib/core/download_options.dart) with the same vectors.
import type { QualityKey } from './types'

export type Mp3Quality = 'best' | '320' | '192' | '128'

export const MP3_QUALITIES: Mp3Quality[] = ['best', '320', '192', '128']

export const isMp3Quality = (v: unknown): v is Mp3Quality => MP3_QUALITIES.includes(v as Mp3Quality)

/** The settings that change what yt-dlp is asked to do. */
export interface DownloadPrefs {
  /** Put the video's thumbnail inside MP3/M4A files as their cover art. */
  embedCover: boolean
  /** Crop that cover to a square (players expect square covers; video thumbnails are 16:9). */
  squareCover: boolean
  /** Write title / artist / year tags into audio files. */
  embedTags: boolean
  mp3Quality: Mp3Quality
}

export const DEFAULT_PREFS: DownloadPrefs = {
  embedCover: true,
  squareCover: true,
  embedTags: true,
  mp3Quality: 'best'
}

/** yt-dlp's `--ppa` that crops the cover to a centered square before it is embedded. */
export const SQUARE_COVER_PPA =
  "ThumbnailsConvertor+FFmpeg_o:-c:v mjpeg -vf crop=\"'if(gt(ih,iw),iw,ih)':'if(gt(iw,ih),ih,iw)'\""

const isAudio = (q: QualityKey): boolean => q === 'mp3' || q === 'm4a'

/** `--audio-quality` value: 0 is the best variable bitrate, otherwise a fixed bitrate. */
export const mp3QualityArg = (q: Mp3Quality): string => (q === 'best' ? '0' : `${q}K`)

/** The extra yt-dlp arguments for the optional features, for one download. */
export function downloadOptionArgs(quality: QualityKey, prefs: DownloadPrefs): string[] {
  const args: string[] = []
  if (isAudio(quality)) {
    if (prefs.embedCover) {
      args.push('--embed-thumbnail', '--convert-thumbnails', 'jpg')
      if (prefs.squareCover) args.push('--ppa', SQUARE_COVER_PPA)
    }
    if (prefs.embedTags) args.push('--embed-metadata')
  }
  return args
}
