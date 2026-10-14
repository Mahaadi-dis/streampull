import { describe, expect, it } from 'vitest'
import { analyzeWith, type RawResult, type RunJson } from './analyze'

const video = (id: string): Record<string, unknown> => ({ id, title: id, url: `https://www.youtube.com/watch?v=${id}` })

/** Fake yt-dlp: answers by URL and records every call. */
function fake(map: Record<string, RawResult>): { run: RunJson; calls: { url: string; end?: number }[] } {
  const calls: { url: string; end?: number }[] = []
  const run: RunJson = async (url, o) => {
    calls.push({ url, end: o.playlistEnd })
    return map[url] ?? { ok: false, error: 'unknown', detail: `unexpected ${url}` }
  }
  return { run, calls }
}

const base = 'https://www.youtube.com/@x'
const tabRoot: RawResult = {
  ok: true,
  raw: {
    title: 'X',
    uploader: 'X Channel',
    thumbnails: [{ id: 'avatar_uncropped', url: 'https://yt3.googleusercontent.com/a=s0' }],
    entries: [
      { _type: 'playlist', webpage_url: `${base}/videos` },
      { _type: 'playlist', webpage_url: `${base}/shorts` }
    ]
  }
}

describe('analyzeWith', () => {
  it('lists a single video', async () => {
    const { run } = fake({ 'https://v.com/a': { ok: true, raw: { title: 'A', formats: [] } } })
    const r = await analyzeWith(run, 'https://v.com/a')
    expect(r.ok && r.info.title).toBe('A')
    expect(r.ok && r.info.channel).toBeUndefined()
  })

  it('probes a YouTube channel root, then lists the chosen tab', async () => {
    const { run, calls } = fake({
      [base]: tabRoot,
      [`${base}/shorts`]: { ok: true, raw: { _type: 'playlist', entries: [video('s1'), video('s2')] } }
    })
    const r = await analyzeWith(run, `${base}/shorts`)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.info.title).toBe('X Channel')
    expect(r.info.channel?.activeTab).toBe('shorts')
    expect(r.info.channel?.tabs.map((t) => t.id)).toEqual(['videos', 'shorts'])
    expect(r.info.entries).toHaveLength(2)
    expect(r.info.thumbnail).toBe('https://yt3.googleusercontent.com/a=s176-c')
    expect(calls.map((c) => c.url)).toEqual([base, `${base}/shorts`])
    expect(calls[0].end).toBe(8) // cheap probe
  })

  it('falls back to Videos when the requested tab does not exist', async () => {
    const { run } = fake({
      [base]: { ok: true, raw: { title: 'X', entries: [{ _type: 'playlist', webpage_url: `${base}/videos` }] } },
      [`${base}/videos`]: { ok: true, raw: { _type: 'playlist', entries: [video('a')] } }
    })
    const r = await analyzeWith(run, `${base}/streams`)
    expect(r.ok && r.info.channel?.activeTab).toBe('videos')
  })

  it('lists a TikTok account as an "account"', async () => {
    const tt = 'https://www.tiktok.com/@name'
    const { run } = fake({
      [tt]: { ok: true, raw: { _type: 'playlist', entries: [{ id: '1', title: 'one', url: `${tt}/video/1` }] } }
    })
    const r = await analyzeWith(run, tt)
    expect(r.ok && r.info.channel?.kind).toBe('account')
    expect(r.ok && r.info.title).toBe('@name')
    expect(r.ok && r.info.site).toBe('TikTok')
  })

  it('passes errors through', async () => {
    const ig = 'https://www.instagram.com/someone/'
    const { run } = fake({ [ig]: { ok: false, error: 'login_required', detail: 'x' } })
    const r = await analyzeWith(run, ig)
    expect(r).toMatchObject({ ok: false, error: 'login_required' })
  })
})
