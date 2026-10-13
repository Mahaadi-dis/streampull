import { describe, expect, it } from 'vitest'
import { classifyResponse, sanitizeFileName, totalSize } from './sniffRules'

const ok = (url: string, h: Record<string, string>, type = 'xhr', status = 200): ReturnType<typeof classifyResponse> =>
  classifyResponse(url, status, h, type)

describe('classifyResponse', () => {
  it('detects HLS by content type and by extension', () => {
    expect(ok('https://a.com/x', { 'Content-Type': 'application/vnd.apple.mpegurl' })?.kind).toBe('hls')
    expect(ok('https://a.com/master.m3u8?t=1', { 'content-type': 'text/plain' })?.kind).toBe('hls')
  })
  it('detects DASH', () => {
    expect(ok('https://a.com/m.mpd', {})?.kind).toBe('dash')
  })
  it('detects a big mp4 and uses content-range total for ranged responses', () => {
    const c = ok('https://a.com/v.mp4', { 'Content-Type': 'video/mp4', 'Content-Range': 'bytes 0-1023/5000000', 'Content-Length': '1024' }, 'media', 206)
    expect(c?.kind).toBe('file')
    expect(c?.size).toBe(5_000_000)
    expect(c?.ext).toBe('mp4')
  })
  it('ignores tiny files, segments and non-media', () => {
    expect(ok('https://a.com/v.mp4', { 'content-type': 'video/mp4', 'content-length': '5000' })).toBeNull()
    expect(ok('https://a.com/seg1.ts', { 'content-type': 'video/mp2t', 'content-length': '900000' })).toBeNull()
    expect(ok('https://a.com/seg.m4s', { 'content-type': 'video/mp4', 'content-length': '900000' })).toBeNull()
    expect(ok('https://a.com/page', { 'content-type': 'text/html' })).toBeNull()
    expect(ok('https://a.com/p.png', { 'content-type': 'image/png', 'content-length': '9000000' }, 'image')).toBeNull()
  })
  it('ignores failed statuses and page-only hosts', () => {
    expect(ok('https://a.com/v.m3u8', {}, 'xhr', 404)).toBeNull()
    expect(ok('https://r1.googlevideo.com/videoplayback?x', { 'content-type': 'video/mp4', 'content-length': '9000000' })).toBeNull()
  })
  it('accepts octet-stream with a media extension', () => {
    expect(ok('https://a.com/f.mkv', { 'content-type': 'application/octet-stream', 'content-length': '9000000' })?.ext).toBe('mkv')
  })
})

describe('helpers', () => {
  it('totalSize', () => {
    expect(totalSize({ 'content-length': '12' })).toBe(12)
    expect(totalSize({})).toBeNull()
  })
  it('sanitizeFileName strips illegal characters', () => {
    expect(sanitizeFileName('a/b:c*d?  "e" ...')).toBe('a b c d e')
    expect(sanitizeFileName('x'.repeat(300))).toHaveLength(150)
  })
})
