// Which helper binaries to fetch for a given OS/CPU (pure, so it can be unit-tested).
//
// Nothing here is bundled with the app: yt-dlp (Unlicense) and FFmpeg are downloaded on first run
// from their official release pages, so the app itself can stay MIT-licensed.

export interface Asset {
  /** Download URL. */
  url: string
  /** File name used inside the app's `bin` folder. */
  file: string
  /** True when the download is gzip-compressed and must be unpacked. */
  gzip: boolean
}

const YTDLP = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/'
const FFMPEG = 'https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/'

const exe = (platform: string): string => (platform === 'win32' ? '.exe' : '')

export function ytdlpAsset(platform: string, arch: string): Asset | null {
  const file = `yt-dlp${exe(platform)}`
  switch (platform) {
    case 'win32':
      return {
        url: YTDLP + (arch === 'arm64' ? 'yt-dlp_arm64.exe' : arch === 'ia32' ? 'yt-dlp_x86.exe' : 'yt-dlp.exe'),
        file,
        gzip: false
      }
    case 'darwin':
      return { url: YTDLP + 'yt-dlp_macos', file, gzip: false } // universal binary
    case 'linux':
      if (arch === 'x64') return { url: YTDLP + 'yt-dlp_linux', file, gzip: false }
      if (arch === 'arm64') return { url: YTDLP + 'yt-dlp_linux_aarch64', file, gzip: false }
      return null
    default:
      return null
  }
}

export function ffmpegAsset(platform: string, arch: string): Asset | null {
  const file = `ffmpeg${exe(platform)}`
  const gz = (name: string): Asset => ({ url: `${FFMPEG}ffmpeg-${name}.gz`, file, gzip: true })
  switch (platform) {
    case 'win32':
      // No native arm64 build; Windows on ARM runs x64 binaries through emulation.
      return arch === 'x64' || arch === 'arm64' ? gz('win32-x64') : null
    case 'darwin':
      return arch === 'arm64' ? gz('darwin-arm64') : arch === 'x64' ? gz('darwin-x64') : null
    case 'linux':
      return ['x64', 'arm64', 'arm', 'ia32'].includes(arch) ? gz(`linux-${arch}`) : null
    default:
      return null
  }
}
