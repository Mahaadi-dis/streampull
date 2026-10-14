import { useState } from 'react'
import { parseAccountUrl } from '@shared/accounts'
import { parseYoutubeChannelUrl } from '@shared/channel'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, ClipboardPaste, FolderOpen, Link2, Loader2, Play, Search, Sparkles } from 'lucide-react'
import { useT } from '@/i18n'
import { formatBytes, qualityLabel, timeAgo } from '@/lib/format'
import { useApp } from '@/store/app'
import { DownloadCard } from '@/components/DownloadCard'
import { EngineBanner } from '@/components/EngineBanner'
import { MediaCard } from '@/components/MediaCard'
import { PlaylistPicker } from '@/components/PlaylistPicker'
import { Thumb } from '@/components/Thumb'
import { useLang } from '@/i18n'

export default function Home(): React.JSX.Element {
  const t = useT()
  const lang = useLang()
  const { analysis, analyze, downloads, history, binary, setPage } = useApp()
  const [url, setUrl] = useState(
    analysis.status === 'loading' ? analysis.url : analysis.status === 'done' ? analysis.info.url : ''
  )
  const busy = analysis.status === 'loading'
  const ready = binary.phase === 'ready'

  const submit = (value = url): void => {
    const v = value.trim()
    if (v && !busy) void analyze(v)
  }

  const paste = async (): Promise<void> => {
    const text = await window.api.readClipboard()
    if (text) {
      setUrl(text)
      submit(text)
    }
  }

  const onDrop = (e: React.DragEvent): void => {
    e.preventDefault()
    const text = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain')
    if (text) {
      setUrl(text.trim())
      submit(text)
    }
  }

  const active = Object.values(downloads)
    .filter((d) => d.status !== 'completed' && d.status !== 'canceled')
    .sort((a, b) => b.createdAt - a.createdAt)
  const recent = history.slice(0, 4)

  return (
    <div onDragOver={(e) => e.preventDefault()} onDrop={onDrop} className="mx-auto max-w-4xl px-8 pb-10 pt-6">
      <div className="mb-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto mb-4 flex w-fit items-center gap-2 rounded-full border border-line bg-white/[0.04] px-3.5 py-1.5 text-xs text-violet-200/80"
        >
          <Sparkles size={13} className="text-brand-pink" /> {t('home.hint')}
        </motion.div>
        <h1 className="bg-gradient-to-br from-white via-violet-100 to-brand-pink bg-clip-text pb-1 text-4xl font-extrabold leading-tight text-transparent">
          {t('home.title')}
        </h1>
        <p className="mt-2 text-violet-200/65">{t('home.subtitle')}</p>
      </div>

      <EngineBanner />

      <div className="card relative mb-6 flex items-center gap-2 p-2 shadow-glow">
        <Link2 size={19} className="ms-3 shrink-0 text-brand-light" />
        <input
          dir="ltr"
          className="min-w-0 flex-1 bg-transparent px-2 py-3 text-base outline-none placeholder:text-violet-300/40"
          style={{ textAlign: 'start' }}
          placeholder={t('home.placeholder')}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          spellCheck={false}
          autoFocus
        />
        <button className="btn-ghost !py-3" onClick={paste} disabled={busy}>
          <ClipboardPaste size={17} /> {t('home.paste')}
        </button>
        <button className="btn-primary !py-3 px-6" onClick={() => submit()} disabled={busy || !url.trim() || !ready}>
          {busy ? <Loader2 size={17} className="animate-spin" /> : <Search size={17} />}
          {busy ? t('home.analyzing') : t('home.analyze')}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {analysis.status === 'loading' && (
          <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="card mb-6 flex gap-6 p-5">
            <div className="relative aspect-video w-72 overflow-hidden rounded-xl bg-white/5">
              <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>
            <div className="flex-1 space-y-3">
              {[0.8, 0.5, 0.3].map((w, i) => (
                <div key={i} className="relative h-5 overflow-hidden rounded-lg bg-white/5" style={{ width: `${w * 100}%` }}>
                  <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </div>
              ))}
              {(parseYoutubeChannelUrl(analysis.url) || parseAccountUrl(analysis.url)) && (
                <p className="pt-1 text-xs text-violet-300/60">{t('home.channelLoading')}</p>
              )}
            </div>
          </motion.div>
        )}
        {analysis.status === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-6 flex items-start gap-3 rounded-2xl border border-bad/30 bg-bad/10 p-4 text-sm"
          >
            <AlertTriangle size={20} className="mt-0.5 shrink-0 text-bad" />
            <div>
              <div className="font-semibold text-red-100">{t(`err.${analysis.code}`)}</div>
              {analysis.detail && analysis.code === 'unknown' && (
                <div className="mt-1 break-all text-xs text-red-200/60" dir="ltr">
                  {analysis.detail}
                </div>
              )}
            </div>
          </motion.div>
        )}
        {analysis.status === 'done' && (
          <div key="result" className="mb-6">
            {analysis.info.isPlaylist ? (
              <PlaylistPicker info={analysis.info} />
            ) : (
              <MediaCard info={analysis.info} />
            )}
          </div>
        )}
      </AnimatePresence>

      {active.length > 0 && (
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">{t('home.active')}</h2>
            <button className="text-sm text-brand-light hover:underline" onClick={() => setPage('downloads')}>
              {t('home.viewAll')}
            </button>
          </div>
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {active.slice(0, 3).map((d) => (
                <DownloadCard key={d.id} item={d} />
              ))}
            </AnimatePresence>
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">{t('home.recent')}</h2>
          {history.length > 0 && (
            <button className="text-sm text-brand-light hover:underline" onClick={() => setPage('library')}>
              {t('home.viewAll')}
            </button>
          )}
        </div>
        {recent.length === 0 ? (
          <div className="card px-6 py-10 text-center text-violet-200/50">{t('home.recentEmpty')}</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {recent.map((h) => (
              <div key={h.id} className="card flex items-center gap-3 p-3">
                <Thumb src={h.thumbnail} audio={h.kind === 'audio'} className="w-28" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium" dir="auto" title={h.title}>
                    {h.title}
                  </div>
                  <div className="mt-0.5 text-xs text-violet-300/60">
                    {qualityLabel(h.quality, t('media.best'))} · <span dir="ltr">{formatBytes(h.sizeBytes)}</span> ·{' '}
                    {timeAgo(h.completedAt, lang)}
                  </div>
                </div>
                <button className="btn-icon" onClick={() => window.api.openFile(h.id)} title={t('lib.open')}>
                  <Play size={16} />
                </button>
                <button className="btn-icon" onClick={() => window.api.showInFolder(h.id)} title={t('lib.folder')}>
                  <FolderOpen size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
