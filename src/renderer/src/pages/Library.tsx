import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FileWarning, FolderOpen, Library as LibIcon, Link2, Play, RotateCw, Search, Trash2 } from 'lucide-react'
import type { HistoryItem } from '@shared/types'
import { useLang, useT } from '@/i18n'
import { formatBytes, qualityLabel, timeAgo } from '@/lib/format'
import { useApp } from '@/store/app'
import { Thumb } from '@/components/Thumb'

type Filter = 'all' | 'video' | 'audio'

export default function Library(): React.JSX.Element {
  const t = useT()
  const lang = useLang()
  const { history, refreshHistory, enqueue, toast } = useApp()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [confirmClear, setConfirmClear] = useState(false)

  useEffect(() => {
    void refreshHistory()
  }, [refreshHistory])

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return history.filter(
      (h) => (filter === 'all' || h.kind === filter) && (!s || h.title.toLowerCase().includes(s))
    )
  }, [history, q, filter])

  const remove = async (h: HistoryItem, withFile: boolean): Promise<void> => {
    await window.api.removeHistory(h.id, withFile)
    await refreshHistory()
  }

  const copyLink = async (h: HistoryItem): Promise<void> => {
    await window.api.copyText(h.link || h.url)
    toast(t('toast.linkCopied'), 'ok')
  }

  const redownload = async (h: HistoryItem): Promise<void> => {
    await enqueue([
      { url: h.url, title: h.title, thumbnail: h.thumbnail, duration: h.duration, uploader: h.uploader, quality: h.quality }
    ])
    toast(t('media.added'), 'ok')
  }

  const clearAll = async (): Promise<void> => {
    if (!confirmClear) {
      setConfirmClear(true)
      setTimeout(() => setConfirmClear(false), 3000)
      return
    }
    await window.api.clearHistory()
    setConfirmClear(false)
    await refreshHistory()
  }

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: t('lib.all') },
    { key: 'video', label: t('lib.video') },
    { key: 'audio', label: t('lib.audio') }
  ]

  return (
    <div className="mx-auto max-w-5xl px-8 pb-10 pt-6">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">{t('lib.title')}</h1>
          <p className="text-sm text-violet-200/55">{t('lib.count', { n: history.length })}</p>
        </div>
        {history.length > 0 && (
          <button className={`btn-ghost ${confirmClear ? '!border-bad/50 !text-bad' : ''}`} onClick={clearAll}>
            <Trash2 size={16} /> {confirmClear ? t('lib.confirmClear') : t('lib.clear')}
          </button>
        )}
      </div>

      <div className="mb-5 flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-violet-300/50" />
          <input className="input ps-10" placeholder={t('lib.search')} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex rounded-xl border border-line bg-white/[0.03] p-1">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                filter === f.key ? 'bg-brand/80 text-white shadow-glow' : 'text-violet-200/65 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {history.length === 0 ? (
        <div className="card flex flex-col items-center px-6 py-20 text-center">
          <div className="mb-5 flex h-20 w-20 animate-float items-center justify-center rounded-3xl bg-gradient-to-br from-brand-deep/40 to-brand-pink/20 text-brand-light shadow-glow">
            <LibIcon size={38} />
          </div>
          <div className="text-lg font-bold">{t('lib.empty')}</div>
          <div className="mt-1 text-sm text-violet-200/55">{t('lib.emptyHint')}</div>
        </div>
      ) : shown.length === 0 ? (
        <div className="py-16 text-center text-violet-200/50">{t('lib.noResults')}</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <AnimatePresence initial={false}>
            {shown.map((h) => (
              <motion.div
                key={h.id}
                layout="position"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="card group overflow-hidden"
              >
                <Thumb src={h.thumbnail} audio={h.kind === 'audio'} duration={h.duration} className="!rounded-none">
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-bg/70 opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
                    <button
                      className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand-deep to-brand-pink shadow-glow transition hover:scale-110 disabled:opacity-40"
                      disabled={!h.fileExists}
                      title={t('lib.open')}
                      onClick={() => window.api.openFile(h.id)}
                    >
                      <Play size={18} fill="white" />
                    </button>
                    <button className="btn-icon h-11 w-11 bg-white/10" title={t('lib.folder')} onClick={() => window.api.showInFolder(h.id)}>
                      <FolderOpen size={18} />
                    </button>
                  </div>
                </Thumb>
                <div className="p-3.5">
                  <div className="line-clamp-2 min-h-10 text-sm font-semibold leading-snug" dir="auto" title={h.title}>
                    {h.title}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-violet-300/60">
                    <span className="chip !px-2 !py-0.5 text-[10px]">{qualityLabel(h.quality, t('media.best'))}</span>
                    <span dir="ltr">{formatBytes(h.sizeBytes)}</span>
                    <span className="ms-auto">{timeAgo(h.completedAt, lang)}</span>
                  </div>
                  {!h.fileExists && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-warn">
                      <FileWarning size={13} /> {t('lib.missing')}
                    </div>
                  )}
                  <div className="mt-2.5 flex items-center gap-1 border-t border-line pt-2.5">
                    <button className="btn-icon h-8 w-8" title={t('lib.redownload')} onClick={() => redownload(h)}>
                      <RotateCw size={15} />
                    </button>
                    <button className="btn-icon h-8 w-8" title={t('dl.copyLink')} onClick={() => copyLink(h)}>
                      <Link2 size={15} />
                    </button>
                    <button className="btn-icon h-8 w-8 hover:!text-bad" title={t('lib.remove')} onClick={() => remove(h, false)}>
                      <Trash2 size={15} />
                    </button>
                    {h.fileExists && (
                      <button
                        className="ms-auto rounded-md px-2 py-1 text-[11px] text-violet-300/50 transition hover:bg-bad/10 hover:text-bad"
                        onClick={() => remove(h, true)}
                      >
                        {t('lib.removeFile')}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
