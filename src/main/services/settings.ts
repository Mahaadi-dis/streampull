import { app } from 'electron'
import { join } from 'path'
import type { Settings } from '@shared/types'
import { DEFAULT_THEME, isThemeId } from '@shared/themes'
import { JsonStore } from './jsonStore'

const defaults = (): Settings => ({
  downloadDir: join(app.getPath('downloads'), 'StreamPull'),
  concurrency: 3,
  lang: 'ar',
  theme: DEFAULT_THEME,
  defaultQuality: 'best',
  nameTemplate: 'title',
  speedLimit: '',
  notifications: true,
  adBlock: true,
  checkUpdates: true
})

let store: JsonStore<Settings>

export function initSettings(): void {
  store = new JsonStore<Settings>('settings', defaults())
}

export const getSettings = (): Settings => store.data

const RATE = /^\d+(\.\d+)?[KMG]?$/i

export function updateSettings(patch: Partial<Settings>): Settings {
  const s = store.data
  if (typeof patch.downloadDir === 'string' && patch.downloadDir.trim()) s.downloadDir = patch.downloadDir
  if (typeof patch.concurrency === 'number') s.concurrency = Math.min(8, Math.max(1, Math.round(patch.concurrency)))
  if (patch.lang === 'ar' || patch.lang === 'en') s.lang = patch.lang
  if (isThemeId(patch.theme)) s.theme = patch.theme
  if (typeof patch.defaultQuality === 'string') s.defaultQuality = patch.defaultQuality
  if (patch.nameTemplate === 'title' || patch.nameTemplate === 'uploader-title' || patch.nameTemplate === 'title-id')
    s.nameTemplate = patch.nameTemplate
  if (typeof patch.speedLimit === 'string' && (patch.speedLimit === '' || RATE.test(patch.speedLimit)))
    s.speedLimit = patch.speedLimit
  if (typeof patch.notifications === 'boolean') s.notifications = patch.notifications
  if (typeof patch.adBlock === 'boolean') s.adBlock = patch.adBlock
  if (typeof patch.checkUpdates === 'boolean') s.checkUpdates = patch.checkUpdates
  store.save()
  return s
}

export const flushSettings = (): void => store?.flush()
