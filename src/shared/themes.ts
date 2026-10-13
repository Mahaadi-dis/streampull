// Color themes. Every theme is a dark palette; the UI reads these as CSS variables
// (`--brand`, `--bg`, … as space-separated "r g b" so Tailwind can add opacity).

type RGB = readonly [number, number, number]

export type ThemeId = 'violet' | 'ocean' | 'emerald' | 'rose' | 'sunset' | 'midnight'

export interface Theme {
  id: ThemeId
  /** page background */
  bg: RGB
  surface: RGB
  surface2: RGB
  surface3: RGB
  brand: RGB
  brandLight: RGB
  brandDeep: RGB
  /** secondary accent used in gradients */
  accent2: RGB
  /** tinted text scale (replaces Tailwind's violet-50…300) */
  t50: RGB
  t100: RGB
  t200: RGB
  t300: RGB
}

export const THEMES: readonly Theme[] = [
  {
    id: 'violet',
    bg: [13, 8, 24],
    surface: [21, 14, 39],
    surface2: [29, 20, 56],
    surface3: [39, 27, 74],
    brand: [139, 92, 246],
    brandLight: [167, 139, 250],
    brandDeep: [124, 58, 237],
    accent2: [192, 132, 252],
    t50: [245, 243, 255],
    t100: [237, 233, 254],
    t200: [221, 214, 254],
    t300: [196, 181, 253]
  },
  {
    id: 'ocean',
    bg: [6, 12, 24],
    surface: [10, 20, 38],
    surface2: [15, 29, 56],
    surface3: [22, 41, 78],
    brand: [59, 130, 246],
    brandLight: [96, 165, 250],
    brandDeep: [37, 99, 235],
    accent2: [34, 211, 238],
    t50: [239, 246, 255],
    t100: [219, 234, 254],
    t200: [191, 219, 254],
    t300: [147, 197, 253]
  },
  {
    id: 'emerald',
    bg: [5, 16, 13],
    surface: [9, 26, 21],
    surface2: [14, 38, 31],
    surface3: [20, 54, 44],
    brand: [16, 185, 129],
    brandLight: [52, 211, 153],
    brandDeep: [5, 150, 105],
    accent2: [45, 212, 191],
    t50: [236, 253, 245],
    t100: [209, 250, 229],
    t200: [167, 243, 208],
    t300: [110, 231, 183]
  },
  {
    id: 'rose',
    bg: [22, 8, 14],
    surface: [36, 14, 24],
    surface2: [54, 20, 36],
    surface3: [76, 29, 52],
    brand: [244, 63, 94],
    brandLight: [251, 113, 133],
    brandDeep: [225, 29, 72],
    accent2: [244, 114, 182],
    t50: [255, 241, 242],
    t100: [255, 228, 230],
    t200: [254, 205, 211],
    t300: [253, 164, 175]
  },
  {
    id: 'sunset',
    bg: [20, 12, 6],
    surface: [33, 20, 10],
    surface2: [49, 30, 14],
    surface3: [69, 42, 19],
    brand: [249, 115, 22],
    brandLight: [251, 146, 60],
    brandDeep: [234, 88, 12],
    accent2: [251, 191, 36],
    t50: [255, 247, 237],
    t100: [255, 237, 213],
    t200: [254, 215, 170],
    t300: [253, 186, 116]
  },
  {
    id: 'midnight',
    bg: [0, 0, 0],
    surface: [10, 8, 16],
    surface2: [18, 14, 28],
    surface3: [28, 22, 44],
    brand: [139, 92, 246],
    brandLight: [167, 139, 250],
    brandDeep: [124, 58, 237],
    accent2: [192, 132, 252],
    t50: [245, 243, 255],
    t100: [237, 233, 254],
    t200: [221, 214, 254],
    t300: [196, 181, 253]
  }
]

export const DEFAULT_THEME: ThemeId = 'violet'

export const isThemeId = (v: unknown): v is ThemeId => THEMES.some((t) => t.id === v)

export const themeById = (id: unknown): Theme => THEMES.find((t) => t.id === id) ?? THEMES[0]

const css = (c: RGB): string => c.join(' ')

/** CSS custom properties for a theme, e.g. `{ '--brand': '139 92 246' }`. */
export function themeVars(t: Theme): Record<string, string> {
  return {
    '--bg': css(t.bg),
    '--surface': css(t.surface),
    '--surface-2': css(t.surface2),
    '--surface-3': css(t.surface3),
    '--brand': css(t.brand),
    '--brand-light': css(t.brandLight),
    '--brand-deep': css(t.brandDeep),
    '--accent2': css(t.accent2),
    '--t50': css(t.t50),
    '--t100': css(t.t100),
    '--t200': css(t.t200),
    '--t300': css(t.t300)
  }
}

export const rgbToHex = (c: RGB): string =>
  '#' + c.map((n) => n.toString(16).padStart(2, '0')).join('')

/** Colors for the native window (background and the Windows/Linux title-bar controls). */
export function windowColors(id: unknown): { color: string; symbolColor: string } {
  const t = themeById(id)
  return { color: rgbToHex(t.bg), symbolColor: rgbToHex(t.t300) }
}
