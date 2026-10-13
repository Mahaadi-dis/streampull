import { isThemeId, themeById, themeVars } from '@shared/themes'

const KEY = 'sp-theme'

/** Apply a theme by setting its CSS variables on <html>. */
export function applyTheme(id: string): void {
  const theme = themeById(id)
  const root = document.documentElement
  for (const [name, value] of Object.entries(themeVars(theme))) root.style.setProperty(name, value)
  root.dataset.theme = theme.id
  try {
    localStorage.setItem(KEY, theme.id)
  } catch {
    /* storage unavailable */
  }
}

/** Apply the last used theme before the first paint so there is no color flash on startup. */
export function applySavedTheme(): void {
  try {
    const id = localStorage.getItem(KEY)
    if (id && isThemeId(id)) applyTheme(id)
  } catch {
    /* storage unavailable */
  }
}
