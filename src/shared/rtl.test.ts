import { describe, expect, it } from 'vitest'
import { isRtlLocale, mirrorX } from './rtl'

describe('isRtlLocale', () => {
  it('recognises right-to-left UI languages', () => {
    for (const l of ['ar', 'ar-SA', 'AR_EG', 'he', 'he-IL', 'fa-IR', 'ur']) expect(isRtlLocale(l)).toBe(true)
  })
  it('leaves left-to-right ones alone', () => {
    for (const l of ['en-US', 'en', 'fr', 'de-DE', 'tr', 'es-419', 'zh-CN', '']) expect(isRtlLocale(l)).toBe(false)
  })
})

describe('mirrorX', () => {
  it('flips a rectangle across the parent', () => {
    expect(mirrorX(300, 600, 1180)).toBe(280)
    expect(mirrorX(0, 940, 1180)).toBe(240)
  })
  it('is its own inverse', () => {
    expect(mirrorX(mirrorX(123, 456, 1180), 456, 1180)).toBe(123)
  })
})
