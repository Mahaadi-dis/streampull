export function formatBytes(n?: number | null): string {
  if (!n || n <= 0) return '—'
  const u = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let v = n
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024
    i++
  }
  return `${v >= 100 || i === 0 ? v.toFixed(0) : v.toFixed(1)} ${u[i]}`
}

export const formatSpeed = (n?: number | null): string => (n ? `${formatBytes(n)}/s` : '—')

export function formatDuration(sec?: number | null): string {
  if (!sec || sec < 0) return ''
  const s = Math.floor(sec)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  const mm = h ? String(m).padStart(2, '0') : String(m)
  return `${h ? h + ':' : ''}${mm}:${String(r).padStart(2, '0')}`
}

export function qualityLabel(key: string, bestLabel: string): string {
  if (key === 'best') return bestLabel
  if (key === 'mp3') return 'MP3'
  if (key === 'm4a') return 'M4A'
  const h = Number(key)
  if (h >= 4320) return `8K · ${h}p`
  if (h >= 2160) return `4K · ${h}p`
  if (h >= 1440) return `2K · ${h}p`
  return `${h}p`
}

export function timeAgo(ts: number, lang: string): string {
  const diff = Math.round((ts - Date.now()) / 1000)
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' })
  const abs = Math.abs(diff)
  if (abs < 60) return rtf.format(diff, 'second')
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
  return rtf.format(Math.round(diff / 86400), 'day')
}
