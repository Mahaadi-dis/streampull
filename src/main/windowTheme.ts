import type { BrowserWindow } from 'electron'
import { windowColors } from '@shared/themes'

/** Re-color the native window and the Windows/Linux title-bar controls to match the theme. */
export function applyWindowTheme(win: BrowserWindow | null, themeId: string): void {
  if (!win || win.isDestroyed()) return
  const { color, symbolColor } = windowColors(themeId)
  win.setBackgroundColor(color)
  if (process.platform !== 'darwin') {
    try {
      win.setTitleBarOverlay({ color, symbolColor, height: 44 })
    } catch {
      /* overlay not available on this platform/window */
    }
  }
}
