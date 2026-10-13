import { existsSync } from 'fs'
import { rm } from 'fs/promises'
import type { HistoryItem } from '@shared/types'
import { JsonStore } from './jsonStore'

let store: JsonStore<HistoryItem[]>

export function initHistory(): void {
  store = new JsonStore<HistoryItem[]>('history', [])
}

export function listHistory(): HistoryItem[] {
  return store.data
    .map((h) => ({ ...h, fileExists: existsSync(h.filePath) }))
    .sort((a, b) => b.completedAt - a.completedAt)
}

export function addHistory(item: HistoryItem): void {
  store.data = [item, ...store.data.filter((h) => h.id !== item.id)].slice(0, 2000)
  store.save()
}

export function getHistory(id: string): HistoryItem | undefined {
  return store.data.find((h) => h.id === id)
}

export async function removeHistory(id: string, deleteFile: boolean): Promise<void> {
  const item = getHistory(id)
  if (item && deleteFile) await rm(item.filePath, { force: true }).catch(() => undefined)
  store.data = store.data.filter((h) => h.id !== id)
  store.save()
}

export async function clearHistory(): Promise<void> {
  store.data = []
  store.save()
}

export const flushHistory = (): void => store?.flush()
