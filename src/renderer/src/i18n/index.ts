import { useCallback } from 'react'
import type { Lang } from '@shared/types'
import { useApp } from '@/store/app'
import ar from './ar.json'
import en from './en.json'

const dicts: Record<Lang, Record<string, string>> = { ar, en }

export function useLang(): Lang {
  return useApp((s) => s.settings?.lang) ?? 'ar'
}

export type TFn = (key: string, vars?: Record<string, string | number>) => string

export function useT(): TFn {
  const lang = useLang()
  return useCallback<TFn>(
    (key, vars) => {
      let s = dicts[lang][key] ?? dicts.en[key] ?? key
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v))
      return s
    },
    [lang]
  )
}
