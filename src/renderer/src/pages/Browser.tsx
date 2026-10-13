import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Download,
  FileVideo,
  Globe,
  Home as HomeIcon,
  Loader2,
  Radio,
  RotateCw,
  ScanSearch,
  ShieldCheck,
  Trash2,
  X
} from 'lucide-react'
import type { SniffItem } from '@shared/types'
import { useT } from '@/i18n'
import { formatBytes } from '@/lib/format'
import { useApp } from '@/store/app'

const SITES: { name: string; url: string; color: string }[] = [
  { name: 'YouTube', url: 'https://www.youtube.com', color: 'from-red-500 to-rose-600' },
  { name: 'X', url: 'https://x.com', color: 'from-slate-500 to-slate-800' },
  { name: 'Instagram', url: 'https://www.instagram.com', color: 'from-fuchsia-500 to-orange-400' },
  { name: 'TikTok', url: 'https://www.tiktok.com', color: 'from-cyan-400 to-pink-500' },
  { name: 'Facebook', url: 'https://www.facebook.com', color: 'from-blue-500 to-indigo-600' },
  { name: 'Vimeo', url: 'https://vimeo.com', color: 'from-sky-400 to-blue-600' },
  { name: 'Dailymotion', url: 'https://www.dailymotion.com', color: 'from-blue-600 to-violet-600' },
  { name: 'Reddit', url: 'https://www.reddit.com', color: 'from-orange-500 to-red-600' },
  { name: 'Twitch', url: 'https://www.twitch.tv', color: 'from-purple-500 to-violet-700' },
  { name: 'SoundCloud', url: 'https://soundcloud.com', color: 'from-orange-400 to-orange-600' }
]

export default function BrowserPage(): React.JSX.Element {
  const t = useT()
  const { nav, sniffed, analyze, setPage, enqueue, toast } = useApp()
  const api = window.api
  const hostRef = useRef<HTMLDivElement>(null)
  const [panel, setPanel] = useState(false)
  const [addr, setAddr] = useState('')
  const [editing, setEditing] = useState(false)
  const start = !nav.url

  useEffect(() => {
    if (!editing) setAddr(nav.url)
  }, [nav.url, editing])

  // Keep the native view glued to the placeholder rectangle.
  useLayoutEffect(() => {
    const el = hostRef.current
    if (start || !el) {
      void api.browserSetBounds(null)
      return
    }
    const push = (): void => {
      const r = el.getBoundingClientRect()
      void api.browserSetBounds({ x: r.x, y: r.y, width: r.width, height: r.height })
    }
    push()
    const ro = new ResizeObserver(push)
    ro.observe(el)
    window.addEventListener('resize', push)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', push)
    }
  }, [start, panel, api])

  // Hide the view when the page unmounts (also done in the store for instant hiding).
  useEffect(() => () => void api.browserSetBounds(null), [api])

  const go = (value: string): void => {
    const v = value.trim()
    if (v) void api.browserNavigate(v)
  }

  const analyzePage = (): void => {
    if (!nav.url) return
    void analyze(nav.url, nav.url)
    setPage('home')
  }

  const download = async (s: SniffItem, index: number): Promise<void> => {
    const title = (s.pageTitle || nav.title || s.host).trim()
    const dupes = sniffed.filter((x) => (x.pageTitle || nav.title || x.host).trim() === title).length
    const referer = s.pageUrl || nav.url
    await enqueue([
      {
        url: s.url,
        title,
        quality: 'best',
        expectedBytes: s.size,
        referer,
        cookieUrl: referer,
        fileName: dupes > 1 ? `${title} (${index + 1})` : title
      }
    ])
    toast(t('media.added'), 'ok')
  }

  const btn = 'btn-icon disabled:opacity-30'

  return (
    <div className="flex h-[calc(100vh-2.75rem)] flex-col">
      <div className="flex items-center gap-1.5 border-b border-line bg-surface/60 px-3 py-2 backdrop-blur-xl">
        <button className={btn} title={t('br.back')} disabled={!nav.canGoBack} onClick={() => api.browserBack()}>
          <ArrowRight size={18} className="hidden rtl:block" />
          <ArrowLeft size={18} className="rtl:hidden" />
        </button>
        <button className={btn} title={t('br.forward')} disabled={!nav.canGoForward} onClick={() => api.browserForward()}>
          <ArrowLeft size={18} className="hidden rtl:block" />
          <ArrowRight size={18} className="rtl:hidden" />
        </button>
        <button
          className={btn}
          title={nav.loading ? t('br.stop') : t('br.reload')}
          disabled={start}
          onClick={() => (nav.loading ? api.browserStop() : api.browserReload())}
        >
          {nav.loading ? <X size={17} /> : <RotateCw size={17} />}
        </button>
        <button className={btn} title={t('br.home')} disabled={start} onClick={() => api.browserHome()}>
          <HomeIcon size={17} />
        </button>

        <div className="relative mx-1 flex-1">
          <Globe size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-brand-light/70" />
          <input
            dir="ltr"
            style={{ textAlign: 'start' }}
            className="input !rounded-full !py-2 ps-9 text-sm"
            placeholder={t('br.address')}
            value={addr}
            spellCheck={false}
            onFocus={(e) => {
              setEditing(true)
              e.currentTarget.select()
            }}
            onBlur={() => setEditing(false)}
            onChange={(e) => setAddr(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                go(addr)
                e.currentTarget.blur()
              }
              if (e.key === 'Escape') {
                setAddr(nav.url)
                e.currentTarget.blur()
              }
            }}
          />
          {nav.loading && (
            <Loader2 size={15} className="absolute end-3 top-1/2 -translate-y-1/2 animate-spin text-brand-light" />
          )}
        </div>

        <button className="btn-ghost !px-3 !py-2" disabled={start} onClick={analyzePage} title={t('br.analyzePageHint')}>
          <ScanSearch size={16} /> {t('br.analyzePage')}
        </button>
        <button
          onClick={() => setPanel((p) => !p)}
          className={`btn !px-3.5 !py-2 ${
            panel || sniffed.length
              ? 'bg-gradient-to-br from-brand-deep to-brand text-white shadow-glow'
              : 'border border-line bg-white/[0.04] text-violet-200/80'
          }`}
        >
          <Radio size={16} className={sniffed.length && !panel ? 'animate-pulse' : ''} />
          {t('br.media')}
          <span
            className={`min-w-5 rounded-full px-1.5 text-center text-[11px] font-bold leading-5 ${
              sniffed.length ? 'bg-white text-brand-deep' : 'bg-white/10 text-violet-200/60'
            }`}
          >
            {sniffed.length}
          </span>
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        <div ref={hostRef} className="relative min-w-0 flex-1">
          {start && (
            <div className="flex h-full flex-col items-center justify-center overflow-y-auto px-8 py-10 text-center">
              <div className="mb-5 flex h-20 w-20 animate-float items-center justify-center rounded-3xl bg-gradient-to-br from-brand-deep/50 to-brand-pink/25 text-brand-light shadow-glow">
                <Globe size={38} />
              </div>
              <h1 className="text-2xl font-extrabold">{t('br.startTitle')}</h1>
              <p className="mt-2 max-w-md text-violet-200/60">{t('br.startHint')}</p>
              <div className="mt-8 grid grid-cols-5 gap-3">
                {SITES.map((s) => (
                  <button
                    key={s.name}
                    onClick={() => go(s.url)}
                    className="group flex w-28 flex-col items-center gap-2 rounded-2xl border border-line bg-white/[0.03] px-2 py-4 transition hover:-translate-y-0.5 hover:border-brand-light/40 hover:bg-white/[0.07] hover:shadow-glow"
                  >
                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-lg font-extrabold text-white shadow-card ${s.color}`}
                      dir="ltr"
                    >
                      {s.name[0]}
                    </span>
                    <span className="text-xs font-medium text-violet-100" dir="ltr">
                      {s.name}
                    </span>
                  </button>
                ))}
              </div>
              <div className="mt-8 flex items-center gap-2 text-xs text-violet-300/50">
                <ShieldCheck size={14} /> {t('br.loginNote')}
              </div>
            </div>
          )}
        </div>

        <AnimatePresence initial={false}>
          {panel && (
            <motion.aside
              key="panel"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 340, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="shrink-0 overflow-hidden border-s border-line bg-surface/70 backdrop-blur-xl"
            >
              <div className="flex h-full w-[340px] flex-col">
                <div className="flex items-center justify-between px-4 py-3">
                  <h2 className="font-bold">{t('br.media')}</h2>
                  <div className="flex items-center gap-1">
                    {sniffed.length > 0 && (
                      <button className="btn-icon h-8 w-8" title={t('br.clear')} onClick={() => api.clearSniffed()}>
                        <Trash2 size={15} />
                      </button>
                    )}
                    <button className="btn-icon h-8 w-8" onClick={() => setPanel(false)}>
                      <X size={16} />
                    </button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 pb-4">
                  {sniffed.length === 0 ? (
                    <div className="flex flex-col items-center px-4 py-16 text-center">
                      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-brand-light/70">
                        <Radio size={26} />
                      </div>
                      <div className="font-semibold">{t('br.mediaEmpty')}</div>
                      <div className="mt-1 text-xs text-violet-200/50">{t('br.mediaEmptyHint')}</div>
                    </div>
                  ) : (
                    sniffed.map((s, i) => (
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
                            <div className="truncate text-sm font-semibold" dir="auto" title={s.pageTitle || nav.title}>
                              {s.pageTitle || nav.title || s.host}
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
                        <button className="btn-primary mt-3 w-full !py-2" onClick={() => download(s, i)}>
                          <Download size={16} /> {t('br.download')}
                        </button>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
