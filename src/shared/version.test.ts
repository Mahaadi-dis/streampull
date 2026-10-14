import { describe, expect, it } from 'vitest'
import { isNewerVersion } from './version'

describe('isNewerVersion', () => {
  it('compares major, minor and patch numerically', () => {
    expect(isNewerVersion('0.3.0', '0.2.0')).toBe(true)
    expect(isNewerVersion('v0.10.0', '0.9.5')).toBe(true)
    expect(isNewerVersion('1.0.0', '0.99.99')).toBe(true)
    expect(isNewerVersion('0.2.1', '0.2.0')).toBe(true)
  })
  it('is false for the same or an older version', () => {
    expect(isNewerVersion('0.2.0', '0.2.0')).toBe(false)
    expect(isNewerVersion('0.1.9', '0.2.0')).toBe(false)
  })
  it('treats a pre-release as older than its release', () => {
    expect(isNewerVersion('1.0.0', '1.0.0-beta.1')).toBe(true)
    expect(isNewerVersion('1.0.0-beta.1', '1.0.0')).toBe(false)
  })
  it('ignores garbage', () => {
    expect(isNewerVersion('latest', '0.2.0')).toBe(false)
    expect(isNewerVersion('0.3.0', '')).toBe(false)
  })
})
