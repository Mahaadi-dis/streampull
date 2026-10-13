import { describe, expect, it } from 'vitest'
import { DEFAULT_THEME, THEMES, isThemeId, rgbToHex, themeById, themeVars, windowColors } from './themes'

describe('themes', () => {
  it('has unique ids and a valid default', () => {
    const ids = THEMES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(isThemeId(DEFAULT_THEME)).toBe(true)
  })
  it('keeps every channel within 0-255', () => {
    for (const t of THEMES) {
      for (const [k, v] of Object.entries(themeVars(t))) {
        const ch = v.split(' ').map(Number)
        expect(ch, `${t.id} ${k}`).toHaveLength(3)
        expect(ch.every((n) => Number.isInteger(n) && n >= 0 && n <= 255), `${t.id} ${k}`).toBe(true)
      }
    }
  })
  it('falls back to the first theme for unknown ids', () => {
    expect(themeById('nope').id).toBe(THEMES[0].id)
    expect(isThemeId('nope')).toBe(false)
  })
  it('produces hex colors for the native window', () => {
    expect(rgbToHex([13, 8, 24])).toBe('#0d0818')
    expect(windowColors('violet')).toEqual({ color: '#0d0818', symbolColor: '#c4b5fd' })
  })
})
