import { describe, expect, it } from 'vitest'
import { evaluateRelease } from './release'

const repo = 'Mahaadi-dis/streampull'

describe('evaluateRelease', () => {
  it('reports a newer release with a link to this project', () => {
    const r = evaluateRelease({ tag_name: 'v0.5.0', html_url: `https://github.com/${repo}/releases/tag/v0.5.0` }, '0.4.0', repo)
    expect(r).toEqual({
      status: 'newer',
      info: { version: '0.5.0', current: '0.4.0', url: `https://github.com/${repo}/releases/tag/v0.5.0` }
    })
  })

  it('says latest when the versions match or the app is ahead', () => {
    expect(evaluateRelease({ tag_name: 'v0.4.0' }, '0.4.0', repo)).toEqual({ status: 'latest', version: '0.4.0' })
    expect(evaluateRelease({ tag_name: 'v0.3.3' }, '0.4.0', repo)).toEqual({ status: 'latest', version: '0.3.3' })
  })

  it('ignores drafts and pre-releases', () => {
    expect(evaluateRelease({ tag_name: 'v9.0.0', prerelease: true }, '0.4.0', repo).status).toBe('latest')
    expect(evaluateRelease({ tag_name: 'v9.0.0', draft: true }, '0.4.0', repo).status).toBe('latest')
  })

  it('never links outside this project', () => {
    const r = evaluateRelease({ tag_name: 'v0.5.0', html_url: 'https://evil.example/download' }, '0.4.0', repo)
    expect(r).toMatchObject({ status: 'newer', info: { url: `https://github.com/${repo}/releases` } })
  })

  it('is an error when the answer is not a release', () => {
    expect(evaluateRelease(null, '0.4.0', repo)).toEqual({ status: 'error' })
    expect(evaluateRelease('nope', '0.4.0', repo)).toEqual({ status: 'error' })
    expect(evaluateRelease({ message: 'API rate limit exceeded' }, '0.4.0', repo)).toEqual({ status: 'error' })
    expect(evaluateRelease({ tag_name: 42 }, '0.4.0', repo)).toEqual({ status: 'error' })
  })
})
