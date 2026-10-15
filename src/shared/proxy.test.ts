import { describe, expect, it } from 'vitest'
import { proxyFromRule } from './proxy'

describe('proxyFromRule', () => {
  it('maps Chromium rules to yt-dlp proxy URLs', () => {
    expect(proxyFromRule('PROXY 10.0.0.1:8080')).toBe('http://10.0.0.1:8080')
    expect(proxyFromRule('PROXY proxy.corp:3128; DIRECT')).toBe('http://proxy.corp:3128')
    expect(proxyFromRule('HTTPS secure.proxy:443')).toBe('https://secure.proxy:443')
    expect(proxyFromRule('SOCKS5 127.0.0.1:1080')).toBe('socks5://127.0.0.1:1080')
    expect(proxyFromRule('SOCKS 127.0.0.1:1080')).toBe('socks4://127.0.0.1:1080')
  })
  it('returns null when no proxy is needed', () => {
    expect(proxyFromRule('DIRECT')).toBeNull()
    expect(proxyFromRule('')).toBeNull()
    expect(proxyFromRule('garbage')).toBeNull()
  })
})
