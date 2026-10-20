/**
 * Sites like YouTube, TikTok or Instagram stream video in small pieces (or behind signed requests), so the
 * browser's network sniffer cannot hand you "the file". yt-dlp understands their pages, though: for these URLs
 * the right move is "analyze the page". This recognises such single-video pages so the UI can say so instead of
 * showing an empty "no video found" list.
 */

const RESERVED_SOUNDCLOUD = new Set(['discover', 'search', 'you', 'stream', 'upload', 'pages', 'settings', 'charts', 'feed', 'messages', 'notifications'])

/** The site name when this URL is a single video/audio page yt-dlp can handle, else null. */
export function videoPageSite(url: string): string | null {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return null
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
  const host = u.hostname.toLowerCase().replace(/^(www|m|mobile|music)\./, '')
  const seg = u.pathname.split('/').filter(Boolean)
  const id = (s: string | undefined): boolean => !!s && /^[\w-]{3,}$/.test(s)

  if (host === 'youtube.com') {
    if (seg[0] === 'watch') return u.searchParams.get('v') ? 'YouTube' : null
    if (['shorts', 'live', 'embed'].includes(seg[0]) && id(seg[1])) return 'YouTube'
    return null
  }
  if (host === 'youtu.be') return id(seg[0]) ? 'YouTube' : null
  if (host === 'tiktok.com') return (seg[1] === 'video' && id(seg[2])) || (['t'].includes(seg[0]) && id(seg[1])) ? 'TikTok' : null
  if (host === 'vm.tiktok.com' || host === 'vt.tiktok.com') return id(seg[0]) ? 'TikTok' : null
  if (host === 'instagram.com') {
    const i = seg.findIndex((s) => ['p', 'reel', 'reels', 'tv'].includes(s))
    return i >= 0 && id(seg[i + 1]) ? 'Instagram' : null
  }
  if (host === 'x.com' || host === 'twitter.com') return seg[1] === 'status' && /^\d+$/.test(seg[2] ?? '') ? 'X' : null
  if (host === 'facebook.com') {
    if (seg[0] === 'watch') return u.searchParams.get('v') ? 'Facebook' : null
    if (seg[0] === 'reel' && id(seg[1])) return 'Facebook'
    return seg.includes('videos') && id(seg[seg.indexOf('videos') + 1]) ? 'Facebook' : null
  }
  if (host === 'fb.watch') return id(seg[0]) ? 'Facebook' : null
  if (host === 'vimeo.com') return seg.some((s) => /^\d{5,}$/.test(s)) ? 'Vimeo' : null
  if (host === 'dailymotion.com') return seg[0] === 'video' && id(seg[1]) ? 'Dailymotion' : null
  if (host === 'twitch.tv') return (seg[0] === 'videos' && /^\d+$/.test(seg[1] ?? '')) || (seg[1] === 'clip' && id(seg[2])) ? 'Twitch' : null
  if (host === 'clips.twitch.tv') return id(seg[0]) ? 'Twitch' : null
  if (host === 'soundcloud.com') return seg.length === 2 && !RESERVED_SOUNDCLOUD.has(seg[0]) ? 'SoundCloud' : null
  return null
}
