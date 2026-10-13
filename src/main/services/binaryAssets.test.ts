import { describe, expect, it } from 'vitest'
import { ffmpegAsset, ytdlpAsset } from './binaryAssets'

describe('ytdlpAsset', () => {
  it('picks the right file per platform', () => {
    expect(ytdlpAsset('win32', 'x64')).toMatchObject({ file: 'yt-dlp.exe', gzip: false })
    expect(ytdlpAsset('win32', 'x64')?.url.endsWith('/yt-dlp.exe')).toBe(true)
    expect(ytdlpAsset('win32', 'arm64')?.url.endsWith('yt-dlp_arm64.exe')).toBe(true)
    expect(ytdlpAsset('darwin', 'arm64')).toMatchObject({ file: 'yt-dlp' })
    expect(ytdlpAsset('darwin', 'arm64')?.url.endsWith('yt-dlp_macos')).toBe(true)
    expect(ytdlpAsset('linux', 'x64')?.url.endsWith('yt-dlp_linux')).toBe(true)
    expect(ytdlpAsset('linux', 'arm64')?.url.endsWith('yt-dlp_linux_aarch64')).toBe(true)
  })
  it('returns null for unsupported targets', () => {
    expect(ytdlpAsset('linux', 'arm')).toBeNull()
    expect(ytdlpAsset('freebsd', 'x64')).toBeNull()
  })
})

describe('ffmpegAsset', () => {
  it('uses gzip builds named per platform/arch', () => {
    expect(ffmpegAsset('win32', 'x64')).toMatchObject({ file: 'ffmpeg.exe', gzip: true })
    expect(ffmpegAsset('win32', 'x64')?.url.endsWith('ffmpeg-win32-x64.gz')).toBe(true)
    expect(ffmpegAsset('win32', 'arm64')?.url.endsWith('ffmpeg-win32-x64.gz')).toBe(true)
    expect(ffmpegAsset('darwin', 'arm64')?.url.endsWith('ffmpeg-darwin-arm64.gz')).toBe(true)
    expect(ffmpegAsset('darwin', 'x64')?.url.endsWith('ffmpeg-darwin-x64.gz')).toBe(true)
    expect(ffmpegAsset('linux', 'arm64')?.url.endsWith('ffmpeg-linux-arm64.gz')).toBe(true)
    expect(ffmpegAsset('linux', 'x64')).toMatchObject({ file: 'ffmpeg' })
  })
  it('returns null when no build exists', () => {
    expect(ffmpegAsset('win32', 'ia32')).toBeNull()
    expect(ffmpegAsset('darwin', 'ia32')).toBeNull()
  })
})
