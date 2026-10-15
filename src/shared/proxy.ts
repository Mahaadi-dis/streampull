/** Turn a Chromium proxy rule ("PROXY host:port; DIRECT", "SOCKS5 host:port" …) into yt-dlp's --proxy value. */
export function proxyFromRule(rule: string): string | null {
  const first = rule.split(';')[0].trim()
  const m = /^(PROXY|HTTPS|SOCKS5|SOCKS4|SOCKS)\s+(\S+)$/i.exec(first)
  if (!m) return null // DIRECT or unrecognised
  const kind = m[1].toUpperCase()
  const scheme = kind === 'PROXY' ? 'http' : kind === 'HTTPS' ? 'https' : kind === 'SOCKS5' ? 'socks5' : 'socks4'
  return `${scheme}://${m[2]}`
}
