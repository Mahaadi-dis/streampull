import { motion } from 'framer-motion'
import { Clock, Download, FileVideo, Radio, Star, Trash2, X } from 'lucide-react'
import type { Bookmark, Visit } from '@shared/bookmarks'
import { hostOf } from '@shared/bookmarks'
import type { SniffItem } from '@shared/types'
import { useT } from '@/i18n'
import { formatBytes } from '@/lib/format'

export type PanelTab = 'media' | 'bookmarks' | 'history'

interface Props {
  tab: PanelTab
  onTab: (t: PanelTab) => void
  onClose: () => void
  navTitle: string
  sniffed: SniffItem[]
  onDownload: (s: SniffItem, index: number) => void
  onClearMedia: () => void
  bookmarks: Bookmark[]
  visits: Visit[]
  onOpen: (url: string) => void
  onRemoveBookmark: (id: string) => void
  onRemoveVisit: (url: string) => void
  onClearVisits: () => void
}

const empty = (icon: React.ReactNode, title: string, hint?: string): React.JSX.Element => (
  <div className="flex flex-col items-center px-4 py-16 text-center">
    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-brand-light/70">{icon}</div>
    <div className="font-semibold">{title}</div>
    {hint && <div className="mt-1 text-xs text-violet-200/50">{hint}</div>}
  </div>
)

function PageRow({
  url,
  title,
  onOpen,
  onRemove,
  removeLabel
}: {
  url: string
  title: string
  onOpen: () => void
  onRemove: () => void
  removeLabel: string
}): React.JSX.Element {
  return (
    <div className="group flex items-center gap-2 rounded-xl border border-line bg-white/[0.04] pe-1.5 ps-3 transition hover:bg-white/[0.07]">
      <button onClick={onOpen} className="min-w-0 flex-1 py-2.5 text-start" title={url}>
        <span className="block truncate text-sm font-medium" dir="auto">
          {title}
        </span>
        <span className="block truncate text-[11px] text-violet-300/50" dir="ltr">
          {hostOf(url)}
        </span>
      </button>
      <button
        className="btn-icon h-8 w-8 shrink-0 opacity-60 hover:opacity-100"
        title={removeLabel}
        aria-label={removeLabel}
        onClick={onRemove}
      >
        <X size={14} />
      </button>
    </div>
  )
}

export default function BrowserPanel(p: Props): React.JSX.Element {
  const t = useT()
  const tabs: { id: PanelTab; icon: React.ReactNode; label: string; count?: number }[] = [
    { id: 'media', icon: <Radio size={14} />, label: t('br.media'), count: p.sniffed.length },
    { id: 'bookmarks', icon: <Star size={14} />, label: t('br.bookmarks') },
    { id: 'history', icon: <Clock size={14} />, label: t('br.history') }
  ]

  return (
    <div className="flex h-full w-[340px] flex-col">
      <div className="flex items-center gap-1 px-3 pb-1 pt-3">
        <div className="flex flex-1 gap-1 rounded-xl bg-white/[0.04] p-1">
          {tabs.map((x) => (
            <button
              key={x.id}
              onClick={() => p.onTab(x.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
                p.tab === x.id ? 'bg-brand/30 text-white' : 'text-violet-200/60 hover:text-violet-100'
              }`}
            >
              {x.icon}
              <span className="truncate">{x.label}</span>
              {x.count ? <span className="rounded-full bg-white px-1.5 text-[10px] font-bold text-brand-deep">{x.count}</span> : null}
            </button>
          ))}
        </div>
        <button className="btn-icon h-8 w-8" onClick={p.onClose}>
          <X size={16} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {p.tab === 'media' && (
          <>
            {p.sniffed.length > 0 && (
              <div className="flex justify-end px-3 pt-2">
                <button className="btn-ghost !px-2.5 !py-1 text-xs" onClick={p.onClearMedia}>
                  <Trash2 size={13} /> {t('br.clear')}
                </button>
              </div>
            )}
            <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 pb-4 pt-2">
              {p.sniffed.length === 0
                ? empty(<Radio size={26} />, t('br.mediaEmpty'), t('br.mediaEmptyHint'))
                : p.sniffed.map((s, i) => (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="rounded-xl border border-line bg-white/[0.04] p-3"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-deep/60 to-brand/30 text-brand-light">
                          <FileVideo size={19} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold" dir="auto" title={s.pageTitle || p.navTitle}>
                            {s.pageTitle || p.navTitle || s.host}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-violet-300/70">
                            <span className="rounded-md bg-brand/25 px-1.5 py-0.5 font-bold uppercase text-brand-light" dir="ltr">
                              {s.ext}
                            </span>
                            <span>{t(`br.kind.${s.kind}`)}</span>
                            {s.size ? <span dir="ltr">{formatBytes(s.size)}</span> : null}
                          </div>
                          <div className="mt-1 truncate text-[11px] text-violet-300/40" dir="ltr">
                            {s.host}
                          </div>
                        </div>
                      </div>
                      <button className="btn-primary mt-3 w-full !py-2" onClick={() => p.onDownload(s, i)}>
                        <Download size={16} /> {t('br.download')}
                      </button>
                    </motion.div>
                  ))}
            </div>
          </>
        )}

        {p.tab === 'bookmarks' && (
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-4 pt-3">
            {p.bookmarks.length === 0
              ? empty(<Star size={26} />, t('br.bookmarksEmpty'), t('br.bookmarksEmptyHint'))
              : p.bookmarks.map((b) => (
                  <PageRow
                    key={b.id}
                    url={b.url}
                    title={b.title}
                    onOpen={() => p.onOpen(b.url)}
                    onRemove={() => p.onRemoveBookmark(b.id)}
                    removeLabel={t('br.remove')}
                  />
                ))}
          </div>
        )}

        {p.tab === 'history' && (
          <>
            {p.visits.length > 0 && (
              <div className="flex justify-end px-3 pt-2">
                <button className="btn-ghost !px-2.5 !py-1 text-xs" onClick={p.onClearVisits}>
                  <Trash2 size={13} /> {t('br.historyClear')}
                </button>
              </div>
            )}
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-4 pt-2">
              {p.visits.length === 0
                ? empty(<Clock size={26} />, t('br.historyEmpty'))
                : p.visits.slice(0, 200).map((v) => (
                    <PageRow
                      key={v.url}
                      url={v.url}
                      title={v.title}
                      onOpen={() => p.onOpen(v.url)}
                      onRemove={() => p.onRemoveVisit(v.url)}
                      removeLabel={t('br.remove')}
                    />
                  ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
