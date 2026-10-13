import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Download, ListVideo, Search, X } from 'lucide-react'
import type { MediaInfo, QualityKey } from '@shared/types'
import { useT } from '@/i18n'
import { useApp } from '@/store/app'
import { formatDuration } from '@/lib/format'
import { QualityPicker } from './QualityPicker'
import { Thumb } from './Thumb'

export function PlaylistPicker({ info }: { info: MediaInfo }): React.JSX.Element {
  const t = useT()
  const { settings, enqueue, toast, clearAnalysis } = useApp()
  const [selected, setSelected] = useState<Set<string>>(() => new Set(info.entries.map((e) => e.url)))
  const [q, setQ] = useState('')
  const [quality, setQuality] = useState<QualityKey>(
    info.options.some((o) => o.key === settings?.defaultQuality) ? (settings?.defaultQuality as string) : 'best'
  )

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return s ? info.entries.filter((e) => e.title.toLowerCase().includes(s)) : info.entries
  }, [info.entries, q])

  const toggle = (url: string): void =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(url)) next.delete(url)
      else next.add(url)
      return next
    })

  const allShownSelected = shown.length > 0 && shown.every((e) => selected.has(e.url))
  const toggleAll = (): void =>
    setSelected((prev) => {
      const next = new Set(prev)
      for (const e of shown) allShownSelected ? next.delete(e.url) : next.add(e.url)
      return next
    })

  const download = async (): Promise<void> => {
    const reqs = info.entries
      .filter((e) => selected.has(e.url))
      .map((e) => ({
        url: e.url,
        title: e.title,
        thumbnail: e.thumbnail,
        duration: e.duration,
        uploader: info.uploader,
        quality,
        cookieUrl: info.cookieUrl
      }))
    if (!reqs.length) return
    await enqueue(reqs)
    toast(t('media.added'), 'ok')
    clearAnalysis()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      className="card relative flex flex-col gap-4 p-5"
    >
      <button onClick={clearAnalysis} className="btn-icon absolute end-3 top-3 h-8 w-8" aria-label={t('common.close')}>
        <X size={16} />
      </button>

      <div className="flex items-center gap-4 pe-8">
        <Thumb src={info.thumbnail} className="w-40" />
        <div className="min-w-0">
          <span className="chip mb-1.5">
            <ListVideo size={12} /> {t('media.playlist')} · {t('media.items', { n: info.entries.length })}
          </span>
          <h2 className="line-clamp-2 text-lg font-bold leading-snug" dir="auto">
            {info.title}
          </h2>
          {info.uploader && (
            <p className="text-sm text-violet-300/70" dir="auto">
              {info.uploader}
            </p>
          )}
        </div>
      </div>

      <QualityPicker options={info.options} value={quality} onChange={setQuality} />

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-violet-300/50" />
          <input
            className="input !py-2 ps-9 text-sm"
            placeholder={t('media.search')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <button className="btn-ghost !py-2" onClick={toggleAll}>
          {allShownSelected ? t('media.selectNone') : t('media.selectAll')}
        </button>
      </div>

      <div className="-me-2 max-h-72 space-y-1 overflow-y-auto pe-2">
        {shown.map((e) => {
          const on = selected.has(e.url)
          return (
            <button
              key={e.url}
              onClick={() => toggle(e.url)}
              className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-start transition ${
                on ? 'border-brand-light/40 bg-brand/10' : 'border-transparent hover:bg-white/5'
              }`}
              style={{ contentVisibility: 'auto', containIntrinsicSize: '0 56px' }}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                  on ? 'border-transparent bg-gradient-to-br from-brand-deep to-brand-pink' : 'border-line'
                }`}
              >
                {on && <Check size={13} strokeWidth={3} />}
              </span>
              <span className="w-7 shrink-0 text-xs tabular-nums text-violet-300/50">{e.index}</span>
              <span className="min-w-0 flex-1 truncate text-sm" dir="auto">
                {e.title}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-violet-300/60">{formatDuration(e.duration)}</span>
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="text-sm text-violet-300/70">{t('media.selected', { n: selected.size })}</span>
        <button className="btn-primary px-7 py-3 text-base" disabled={!selected.size} onClick={download}>
          <Download size={18} /> {t('media.downloadSelected', { n: selected.size })}
        </button>
      </div>
    </motion.div>
  )
}
