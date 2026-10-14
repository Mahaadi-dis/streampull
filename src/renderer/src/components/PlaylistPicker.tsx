import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Download, Film, ListVideo, Loader2, Radio, Search, Smartphone, Tv, X } from 'lucide-react'
import type { ChannelTabId } from '@shared/channel'
import type { MediaInfo, PlaylistEntry, QualityKey } from '@shared/types'
import { useT } from '@/i18n'
import { useApp } from '@/store/app'
import { formatDuration } from '@/lib/format'
import { QualityPicker } from './QualityPicker'
import { Thumb } from './Thumb'

const TAB_ICONS: Record<ChannelTabId, typeof Film> = { videos: Film, shorts: Smartphone, streams: Radio }

/** Streams that are on air or scheduled can't be saved as files yet. */
const selectable = (e: PlaylistEntry): boolean => !e.liveStatus

export function PlaylistPicker({ info }: { info: MediaInfo }): React.JSX.Element {
  const t = useT()
  const { settings, enqueue, toast, clearAnalysis, loadChannelTab, tabLoading } = useApp()
  const channel = info.channel

  // Playlists start fully selected; channels can be huge, so they start empty.
  const initial = (): Set<string> =>
    channel ? new Set() : new Set(info.entries.filter(selectable).map((e) => e.url))
  const [selected, setSelected] = useState<Set<string>>(initial)
  const [q, setQ] = useState('')
  const [quality, setQuality] = useState<QualityKey>(
    info.options.some((o) => o.key === settings?.defaultQuality) ? (settings?.defaultQuality as string) : 'best'
  )

  // A different list arrived (another channel tab): start over.
  useEffect(() => {
    setSelected(initial())
    setQ('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info.url])

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return s ? info.entries.filter((e) => e.title.toLowerCase().includes(s)) : info.entries
  }, [info.entries, q])
  const shownSelectable = useMemo(() => shown.filter(selectable), [shown])

  const toggle = (url: string): void =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(url)) next.delete(url)
      else next.add(url)
      return next
    })

  const allShownSelected = shownSelectable.length > 0 && shownSelectable.every((e) => selected.has(e.url))
  const toggleAll = (): void =>
    setSelected((prev) => {
      const next = new Set(prev)
      for (const e of shownSelectable) allShownSelected ? next.delete(e.url) : next.add(e.url)
      return next
    })

  const switchTab = async (tab: { id: ChannelTabId; url: string }): Promise<void> => {
    const err = await loadChannelTab(tab)
    if (err) toast(t(`err.${err}`), 'error')
  }

  const download = async (): Promise<void> => {
    const reqs = info.entries
      .filter((e) => selected.has(e.url) && selectable(e))
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

  const loading = tabLoading !== null

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
        {channel ? (
          <Avatar src={info.thumbnail} />
        ) : (
          <Thumb src={info.thumbnail} className="w-40" />
        )}
        <div className="min-w-0">
          <span className="chip mb-1.5">
            {channel ? <Tv size={12} /> : <ListVideo size={12} />}{' '}
            {channel ? t(channel.kind === 'account' ? 'media.account' : 'media.channel') : t('media.playlist')} ·{' '}
            {t('media.items', { n: info.entries.length })}
          </span>
          <h2 className="line-clamp-2 text-lg font-bold leading-snug" dir="auto">
            {info.title}
          </h2>
          {channel ? (
            <p className="text-sm text-violet-300/70">
              {t(channel.kind === 'account' ? 'media.accountHint' : 'media.channelHint')}
            </p>
          ) : (
            info.uploader && (
              <p className="text-sm text-violet-300/70" dir="auto">
                {info.uploader}
              </p>
            )
          )}
        </div>
      </div>

      {channel && channel.tabs.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {channel.tabs.map((tab) => {
            const active = tab.id === channel.activeTab
            const Icon = TAB_ICONS[tab.id]
            const busy = tabLoading === tab.id
            return (
              <button
                key={tab.id}
                disabled={loading || active}
                onClick={() => void switchTab(tab)}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition active:scale-95 ${
                  active
                    ? 'border-brand-light/70 bg-gradient-to-br from-brand-deep/90 to-brand/80 text-white shadow-glow'
                    : 'border-line bg-white/[0.04] text-violet-100 hover:border-brand-light/40 hover:bg-white/[0.08] disabled:opacity-60'
                }`}
              >
                {busy ? <Loader2 size={15} className="animate-spin" /> : <Icon size={15} />}
                {t(`tab.${tab.id}`)}
                {active && (
                  <span className="rounded-full bg-white/20 px-2 text-xs tabular-nums">{info.entries.length}</span>
                )}
              </button>
            )
          })}
        </div>
      )}

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
        <button className="btn-ghost !py-2" disabled={!shownSelectable.length} onClick={toggleAll}>
          {allShownSelected ? t('media.selectNone') : t('media.selectAll')}
        </button>
      </div>

      <div className="relative">
        <div
          className={`-me-2 space-y-1 overflow-y-auto pe-2 transition-opacity ${channel ? 'max-h-80' : 'max-h-72'} ${
            loading ? 'pointer-events-none opacity-30' : ''
          }`}
        >
          {shown.length === 0 && (
            <div className="py-10 text-center text-sm text-violet-300/60">{t('media.tabEmpty')}</div>
          )}
          {shown.map((e) => {
            const on = selected.has(e.url)
            const ok = selectable(e)
            return (
              <button
                key={e.url}
                disabled={!ok}
                onClick={() => toggle(e.url)}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-start transition ${
                  on ? 'border-brand-light/40 bg-brand/10' : 'border-transparent hover:bg-white/5'
                } ${ok ? '' : 'cursor-not-allowed opacity-55'}`}
                style={{ contentVisibility: 'auto', containIntrinsicSize: channel ? '0 64px' : '0 56px' }}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                    on ? 'border-transparent bg-gradient-to-br from-brand-deep to-brand-pink' : 'border-line'
                  }`}
                >
                  {on && <Check size={13} strokeWidth={3} />}
                </span>
                {channel && <RowThumb src={e.thumbnail} />}
                <span className="w-7 shrink-0 text-xs tabular-nums text-violet-300/50">{e.index}</span>
                <span className="min-w-0 flex-1 truncate text-sm" dir="auto">
                  {e.title}
                </span>
                {e.liveStatus && (
                  <span
                    className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold ${
                      e.liveStatus === 'live' ? 'bg-bad/20 text-bad' : 'bg-warn/20 text-warn'
                    }`}
                  >
                    {t(e.liveStatus === 'live' ? 'media.live' : 'media.upcoming')}
                  </span>
                )}
                <span className="shrink-0 text-xs tabular-nums text-violet-300/60">{formatDuration(e.duration)}</span>
              </button>
            )
          })}
        </div>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm font-medium text-violet-100">
            <Loader2 size={18} className="animate-spin text-brand-light" /> {t('media.tabLoading')}
          </div>
        )}
      </div>

      {channel?.truncated && (
        <p className="text-xs text-warn">{t('media.truncated', { n: info.entries.length })}</p>
      )}

      <div className="flex items-center justify-between pt-1">
        <span className="text-sm text-violet-300/70">{t('media.selected', { n: selected.size })}</span>
        <button className="btn-primary px-7 py-3 text-base" disabled={!selected.size || loading} onClick={download}>
          <Download size={18} /> {t('media.downloadSelected', { n: selected.size })}
        </button>
      </div>
    </motion.div>
  )
}

function Avatar({ src }: { src?: string | null }): React.JSX.Element {
  const [failed, setFailed] = useState(false)
  return (
    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-surface-3 to-surface-2 text-brand-light/60 shadow-card">
      {src && !failed ? (
        <img
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
          draggable={false}
        />
      ) : (
        <Tv size={30} />
      )}
    </div>
  )
}

function RowThumb({ src }: { src?: string | null }): React.JSX.Element {
  const [failed, setFailed] = useState(false)
  return (
    <span className="relative aspect-video h-9 shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-surface-3 to-surface-2">
      {src && !failed && (
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
          draggable={false}
        />
      )}
    </span>
  )
}
