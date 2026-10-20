import { app, net, screen, session } from 'electron'
import { homedir, release, type, arch, cpus, totalmem } from 'os'
import { describeError, getBinaryState, probeBinaries } from './binaries'
import { getBrowserStats } from './browser'
import { getSettings } from './settings'
import { analyze, currentProxyArgs, refreshProxy } from './ytdlp'

/** One network probe, through the same network stack the app uses to download its tools. */
async function check(url: string): Promise<string> {
  const t0 = Date.now()
  try {
    const res = await net.fetch(url, { signal: AbortSignal.timeout(15_000) })
    await res.body?.cancel()
    return `OK (HTTP ${res.status}, ${Date.now() - t0} ms)`
  } catch (e) {
    return `FAILED - ${describeError(e)}`
  }
}

/**
 * A plain-text report for "it does not work on my machine": versions, whether the helper programs run, whether
 * GitHub / YouTube are reachable (and through which proxy), and a real test analysis. No personal data beyond
 * the OS version; the home folder is masked.
 */
export async function runDiagnostics(): Promise<string> {
  const lines: string[] = []
  const add = (s = ''): number => lines.push(s)
  const mask = (p: string): string => p.replace(homedir(), '~')

  add(`StreamPull ${app.getVersion()} ${app.isPackaged ? '' : '(dev)'}`.trim())
  add(`Electron ${process.versions.electron} / Chromium ${process.versions.chrome} / Node ${process.versions.node}`)
  add(`OS: ${type()} ${release()} ${arch()} | CPU: ${cpus()[0]?.model ?? '?'} x${cpus().length} | RAM: ${Math.round(totalmem() / 1048576)} MB`)
  add(`Locale: ${app.getLocale()} | Data folder: ${mask(app.getPath('userData'))}`)
  add(`Ad blocker: ${getSettings().adBlock ? 'on' : 'off'} | Update check: ${getSettings().checkUpdates ? 'on' : 'off'}`)
  add()

  add('== Engine ==')
  add(`State: ${JSON.stringify(getBinaryState())}`)
  const bins = await probeBinaries()
  add(`yt-dlp: ${mask(bins.ytdlp)}`)
  add(`ffmpeg: ${mask(bins.ffmpeg)}`)
  add()

  add('== Built-in browser ==')
  const bs = getBrowserStats()
  add(`UI language: ${app.getLocale()}${bs.rtlMirror ? ' (right-to-left: page view position is mirrored)' : ''} | display scale: ${screen.getPrimaryDisplay().scaleFactor}`)
  add(`Ad blocker: filter lists ${bs.engine}${bs.engineError ? ` (${bs.engineError})` : ''}${bs.lastError ? ` | hook error: ${bs.lastError}` : ''}`)
  add(`Open tabs: ${bs.tabs} | requests seen: ${bs.requests} | blocked: ${bs.blocked} | responses inspected: ${bs.headers} | videos detected: ${bs.sniffed}`)
  add()

  add('== Network (what the app can reach) ==')
  await refreshProxy()
  add(`yt-dlp proxy: ${currentProxyArgs()[1] ?? 'none (direct)'}`)
  for (const url of ['https://github.com', 'https://api.github.com', 'https://objects.githubusercontent.com', 'https://www.youtube.com/robots.txt']) {
    let proxy = 'DIRECT'
    try {
      proxy = await session.defaultSession.resolveProxy(url)
    } catch {
      /* ignore */
    }
    add(`${url}  [proxy: ${proxy}]`)
    add(`  ${await check(url)}`)
  }
  add()

  add('== Test analysis (YouTube sample video) ==')
  const t0 = Date.now()
  const r = await analyze('https://youtu.be/jNQXAC9IVRw')
  add(r.ok ? `OK - "${r.info.title}" (${r.info.options.length} options, ${Date.now() - t0} ms)` : `FAILED - ${r.error}${r.detail ? `: ${r.detail}` : ''} (${Date.now() - t0} ms)`)
  return lines.join('\n')
}
