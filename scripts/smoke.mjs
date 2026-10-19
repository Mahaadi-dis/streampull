// End-to-end smoke test of the real app, driven over the DevTools protocol. Run it against a freshly started
// instance (a clean data folder behaves like a first install):
//
//   StreamPull.exe --user-data-dir=<dir> --remote-debugging-port=9333
//   SMOKE_USERDATA=<dir> SMOKE_DOWNLOADS=<dir2> node scripts/smoke.mjs 9333
//
// It checks: the download engine installs and starts, a link can be analyzed and downloaded, and the built-in
// browser notices a video on a page. Everything runs against a local server, so it needs no particular site and
// works from CI machines. Exit code 0 = all good.

import { createServer } from 'node:http'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const PORT = Number(process.argv[2] || 9333)
const USERDATA = process.env.SMOKE_USERDATA
const DOWNLOADS = process.env.SMOKE_DOWNLOADS
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const lines = []
const log = (...a) => {
  const line = [new Date().toISOString().slice(11, 19), ...a].join(' ')
  lines.push(line)
  console.log(line)
}
// On GitHub Actions, failures are also written as annotations: those are readable without being signed in.
const annotate = (level, title, text) => {
  if (process.env.GITHUB_ACTIONS) console.log(`::${level} title=${title}::${String(text).slice(0, 3500).replace(/%/g, '%25').replace(/\r/g, '').replace(/\n/g, '%0A')}`)
}
const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  log(ok ? 'PASS' : 'FAIL', name, detail)
}

async function pageTarget() {
  for (let i = 0; i < 90; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()
      const t = list.find((x) => x.type === 'page' && /index\.html|localhost:\d+/.test(x.url))
      if (t) return t
    } catch {
      /* app not up yet */
    }
    await sleep(1000)
  }
  throw new Error('the app window never appeared')
}

let target
try {
  target = await pageTarget()
} catch (e) {
  let seen = ''
  try {
    seen = JSON.stringify(await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).slice(0, 800)
  } catch (err) {
    seen = 'DevTools endpoint not reachable: ' + (err instanceof Error ? err.message : err)
  }
  log('ERROR', e instanceof Error ? e.message : e, seen)
  annotate('error', 'smoke: app window never appeared', lines.join('\n'))
  process.exit(1)
}
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let nextId = 0
const waiting = new Map()
ws.onmessage = (m) => {
  const d = JSON.parse(m.data)
  if (d.id && waiting.has(d.id)) {
    waiting.get(d.id)(d)
    waiting.delete(d.id)
  }
}
const evalIn = (expression) =>
  new Promise((resolve) => {
    const id = ++nextId
    waiting.set(id, resolve)
    ws.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } }))
  }).then((d) => {
    if (d.result?.exceptionDetails) throw new Error(d.result.exceptionDetails.exception?.description ?? 'evaluation failed')
    return d.result?.result?.value
  })

async function main() {
  for (let i = 0; i < 40 && (await evalIn('typeof window.api')) !== 'object'; i++) await sleep(500)
  check('app window loads with its bridge', (await evalIn('typeof window.api')) === 'object')

  // 1. engine
  let state
  for (let i = 0; i < 900; i++) {
    state = await evalIn('window.api.getBinaryState()')
    if (state?.phase === 'ready' || state?.phase === 'error') break
    if (i % 10 === 0) log('engine:', JSON.stringify(state))
    await sleep(1000)
  }
  check('download engine installs and starts', state?.phase === 'ready', JSON.stringify(state))
  if (state?.phase !== 'ready') return

  if (DOWNLOADS) {
    mkdirSync(DOWNLOADS, { recursive: true })
    await evalIn(`window.api.setSettings({ downloadDir: ${JSON.stringify(DOWNLOADS)} })`)
  }

  // 2. a local site with a video (generated with the app's own FFmpeg)
  const work = join(process.env.TEMP || process.env.TMPDIR || '.', 'streampull-smoke')
  mkdirSync(work, { recursive: true })
  const clip = join(work, 'clip.mp4')
  const ffmpeg = USERDATA ? join(USERDATA, 'bin', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg') : 'ffmpeg'
  const gen = spawnSync(ffmpeg, ['-y', '-f', 'lavfi', '-i', 'testsrc2=duration=12:size=640x480:rate=25', '-b:v', '1500k', '-minrate', '1500k', '-maxrate', '1500k', '-bufsize', '3000k', '-pix_fmt', 'yuv420p', clip], { encoding: 'utf8' })
  check('test video generated with the bundled FFmpeg', gen.status === 0 && existsSync(clip) && statSync(clip).size > 300 * 1024, gen.stderr?.slice(-200))
  const server = createServer((req, res) => {
    if (req.url === '/page.html') {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.end('<!doctype html><title>Smoke page</title><video src="/clip.mp4" preload="auto" muted autoplay loop width="320"></video>')
    } else if (req.url?.startsWith('/clip.mp4')) {
      const data = readFileSync(clip)
      res.writeHead(200, { 'content-type': 'video/mp4', 'content-length': data.length, 'accept-ranges': 'none' })
      res.end(data)
    } else {
      res.writeHead(404).end()
    }
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const base = `http://127.0.0.1:${server.address().port}`

  // 3. analyze
  const analyzed = await evalIn(`window.api.analyze(${JSON.stringify(base + '/clip.mp4')}).then(r => r.ok ? { ok: true, options: r.info.options.length } : r)`)
  check('a link can be analyzed', analyzed?.ok === true, JSON.stringify(analyzed))

  // 4. download
  const added = await evalIn(`window.api.addToQueue([{ url: ${JSON.stringify(base + '/clip.mp4')}, title: 'smoke test', quality: 'best' }])`)
  const id = added?.[0]?.id
  let item
  for (let i = 0; i < 90 && id; i++) {
    item = (await evalIn('window.api.listQueue()')).find((x) => x.id === id)
    if (item && ['completed', 'error', 'canceled'].includes(item.status)) break
    await sleep(1000)
  }
  const saved = item?.filePath && existsSync(item.filePath) && statSync(item.filePath).size > 1000
  check('a download completes and the file is saved', item?.status === 'completed' && !!saved, JSON.stringify({ status: item?.status, error: item?.errorDetail, file: item?.filePath }))

  // 5. the built-in browser notices the video
  await evalIn('window.api.browserSetBounds({ x: 300, y: 100, width: 800, height: 500 })')
  await evalIn(`window.api.browserNavigate(${JSON.stringify(base + '/page.html')})`)
  let sniffed = []
  for (let i = 0; i < 20; i++) {
    await sleep(1500)
    sniffed = await evalIn('window.api.listSniffed()')
    if (sniffed.some((s) => s.url.includes('clip.mp4'))) break
  }
  check('the browser detects the video on a page', sniffed.some((s) => s.url.includes('clip.mp4')), JSON.stringify(sniffed.map((s) => s.url)))
  const tabs = await evalIn('window.api.browserTabs()')
  check('the browser has a tab showing the page', tabs?.tabs?.some((t) => t.title === 'Smoke page'), JSON.stringify(tabs?.tabs?.map((t) => t.title)))

  // 6. copying a link to the clipboard (the Copy link button on download cards)
  const sample = 'https://example.test/watch?v=smoke'
  await evalIn(`window.api.copyText(${JSON.stringify(sample)})`)
  check('a link can be copied to the clipboard', (await evalIn('window.api.readClipboard()')) === sample)

  // 7. diagnostics report is produced
  const report = await evalIn('window.api.runDiagnostics()')
  check('the diagnostics report works', typeof report === 'string' && report.includes('== Engine =='))
  log('--- diagnostics ---\n' + report)
  server.close()
}

let failed = false
try {
  await main()
} catch (e) {
  failed = true
  log('ERROR', e instanceof Error ? e.message : e)
}
ws.close()
const bad = results.filter((r) => !r.ok)
log(`${results.length - bad.length}/${results.length} checks passed`)
if (failed || bad.length) {
  for (const r of bad) annotate('error', 'smoke check failed', r.name + ' ' + (r.detail || ''))
  annotate('error', 'smoke log (tail)', lines.slice(-40).join('\n'))
}
process.exit(failed || bad.length ? 1 : 0)
