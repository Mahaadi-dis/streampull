// Turns a pasted URL into something the UI can show (single video, playlist, YouTube channel, social
// account). Platform-neutral: the caller supplies `run`, which executes yt-dlp (Electron: a child
// process) and returns its parsed `-J --flat-playlist` JSON.

import { parseAccountUrl, type ParsedAccountUrl } from './accounts'
import { parseYoutubeChannelUrl, type ParsedChannelUrl } from './channel'
import type { AnalyzeResult, ErrorCode } from './types'
import { CHANNEL_LIST_CAP, CHANNEL_ROOT_PROBE, channelAvatar, channelTabsFromRoot, mapInfo } from './ytdlpArgs'

export type RawResult = { ok: true; raw: Record<string, unknown> } | { ok: false; error: ErrorCode; detail?: string }

export interface RunOptions {
  timeoutMs: number
  /** Passed as `--playlist-end`. */
  playlistEnd?: number
}

export type RunJson = (url: string, opts: RunOptions) => Promise<RawResult>

export const ACCOUNT_LIST_CAP = 300

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)

export async function analyzeWith(run: RunJson, url: string): Promise<AnalyzeResult> {
  const channel = parseYoutubeChannelUrl(url)
  if (channel) return analyzeChannel(run, channel, url)
  const account = parseAccountUrl(url)
  if (account) return analyzeAccount(run, account, url)
  return analyzeUrl(run, url)
}

async function analyzeUrl(run: RunJson, url: string): Promise<AnalyzeResult> {
  const r = await run(url, { timeoutMs: 90_000 })
  return r.ok ? { ok: true, info: mapInfo(url, r.raw) } : r
}

/** A TikTok / Instagram profile: list its posts. */
async function analyzeAccount(run: RunJson, acc: ParsedAccountUrl, originalUrl: string): Promise<AnalyzeResult> {
  const list = await run(acc.base, { timeoutMs: 300_000, playlistEnd: ACCOUNT_LIST_CAP })
  if (!list.ok) return list
  const info = mapInfo(acc.base, list.raw)
  if (!info.isPlaylist) return analyzeUrl(run, originalUrl)
  const name = `@${acc.handle}`
  return {
    ok: true,
    info: {
      ...info,
      title: name,
      uploader: name,
      site: acc.platform === 'tiktok' ? 'TikTok' : 'Instagram',
      isPlaylist: true,
      channel: {
        kind: 'account',
        tabs: [{ id: 'videos', url: acc.base }],
        activeTab: 'videos',
        truncated: info.entries.length >= ACCOUNT_LIST_CAP
      }
    }
  }
}

/** A YouTube channel: find its tabs, then list the requested one (Videos by default). */
async function analyzeChannel(run: RunJson, ch: ParsedChannelUrl, originalUrl: string): Promise<AnalyzeResult> {
  const root = await run(ch.base, { timeoutMs: 60_000, playlistEnd: CHANNEL_ROOT_PROBE })
  if (!root.ok) return root

  const tabs = channelTabsFromRoot(root.raw, ch.base)
  const wanted = ch.tab && tabs.some((t) => t.id === ch.tab) ? ch.tab : null
  const active = tabs.find((t) => t.id === (wanted ?? 'videos')) ?? tabs[0]
  if (!active) return analyzeUrl(run, originalUrl)

  const list = await run(active.url, { timeoutMs: 300_000, playlistEnd: CHANNEL_LIST_CAP })
  if (!list.ok) return list

  const info = mapInfo(active.url, list.raw)
  const name = str(root.raw.uploader) ?? str(root.raw.channel) ?? info.title
  return {
    ok: true,
    info: {
      ...info,
      title: name,
      uploader: name,
      thumbnail: channelAvatar(root.raw.thumbnails) ?? info.thumbnail,
      site: 'Youtube',
      isPlaylist: true,
      channel: { tabs, activeTab: active.id, truncated: info.entries.length >= CHANNEL_LIST_CAP }
    }
  }
}
