import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  BookMarked,
  Clock,
  Globe,
  History,
  Home as HomeIcon,
  Loader2,
  Radio,
  RotateCw,
  ScanSearch,
  ShieldCheck,
  ShieldOff,
  Star,
  X
} from 'lucide-react'
import type { SniffItem } from '@shared/types'
import { isBookmarked, suggest } from '@shared/bookmarks'
import { videoPageSite } from '@shared/pageVideo'
import { useT } from '@/i18n'
import { useApp } from '@/store/app'
import { useBrowserLists } from '@/lib/useBrowserLists'
import BrowserPanel, { type PanelTab } from '@/components/browser/BrowserPanel'
import StartPage from '@/components/browser/StartPage'
import TabStrip from '@/components/browser/TabStrip'

/** The first tab is opened once per app run (a ref would not survive React's dev double-mount). */
let firstTabRequested = false
/** Sites whose "analyze this page" card has already been shown automatically in this run. */
const announcedSites = new Set<string>()

export default function BrowserPage(): React.JSX.Element {
  const t = useT()
  const { nav, tabs, sniffed, settings, updateSettings, analyze, setPage, enqueue, toast } = useApp()
  const api = window.api
  const hostRef = useRef<HTMLDivElement>(null)
  const [panel, setPanel] = useState(false)
  const [panelTab, setPanelTab] = useState<PanelTab>('media')
  const [addr, setAddr] = useState('')
  const [editing, setEditing] = useState(false)
  const [sel, setSel] = useState(-1)
  const lists = useBrowserLists(nav.url)
  const start = !nav.url
  const activeTab = tabs.tabs.find((x) => x.id === tabs.activeId)
  const adBlock = settings?.adBlock ?? true

  const suggestions = useMemo(
    () => (editing && addr.trim() && addr !== nav.url ? suggest(lists.bookmarks, lists.visits, addr) : []),
    [editing, addr, nav.url, lists.bookmarks, lists.visits]
  )
  // The page lives in a native view that paints over HTML, so it steps aside while suggestions are shown.
  const overlay = suggestions.length > 0
  const starred = !!nav.url && isBookmarked(lists.bookmarks, nav.url)
  const pageSite = videoPageSite(nav.url)

  useEffect(() => {
    if (!editing) setAddr(nav.url)
  }, [nav.url, editing])

  // The first time a video page of a site like YouTube is opened, show the "analyze this page" card on its own,
  // so people are not left wondering why the media list is empty while a video plays.
  useEffect(() => {
    if (pageSite && !announcedSites.has(pageSite)) {
      announcedSites.add(pageSite)
      setPanelTab('media')
      setPanel(true)
    }
  }, [pageSite])

  useEffect(() => {
    if (!firstTabRequested && tabs.tabs.length === 0) {
      firstTabRequested = true
      void api.browserNewTab()
    }
  }, [api, tabs.tabs.length])

  // Keep the native view glued to the placeholder rectangle.
  useLayoutEffect(() => {
    const el = hostRef.current
    if (start || overlay || !el) {
      void api.browserSetBounds(null)
      return
    }
    // The native view is not part of the page, so a layout shift (sidebar, scrollbar, fonts loading, window
    // resize, display scaling) would leave it misplaced. Check the rectangle every frame and only send changes.
    let last = ''
    let frame = 0
    const tick = (): void => {
      const r = el.getBoundingClientRect()
      const key = `${r.x}|${r.y}|${r.width}|${r.height}`
      if (key !== last) {
        last = key
        void api.browserSetBounds({ x: r.x, y: r.y, width: r.width, height: r.height })
      }
      frame = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(frame)
  }, [start, overlay, panel, api])

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

  const showPanel = (tab: PanelTab): void => {
    if (panel && panelTab === tab) setPanel(false)
    else {
      setPanelTab(tab)
      setPanel(true)
    }
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
  const blocked = activeTab?.blocked ?? 0

  return (
    <div className="-mt-11 flex h-screen flex-col">
      <TabStrip state={tabs} />

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
          {nav.loading ? (
            <Loader2 size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 animate-spin text-brand-light" />
          ) : (
            <Globe size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-brand-light/70" />
          )}
          <input
            dir="ltr"
            style={{ textAlign: 'start' }}
            className="input !rounded-full !py-2 !pe-11 ps-9 text-sm"
            placeholder={t('br.address')}
            value={addr}
            spellCheck={false}
            onFocus={(e) => {
              setEditing(true)
              e.currentTarget.select()
            }}
            onBlur={() => {
              // let a click on a suggestion land before the list disappears
              setTimeout(() => {
                setEditing(false)
                setSel(-1)
              }, 120)
            }}
            onChange={(e) => {
              setAddr(e.target.value)
              setSel(-1)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' && suggestions.length) {
                e.preventDefault()
                setSel((i) => (i + 1) % suggestions.length)
              } else if (e.key === 'ArrowUp' && suggestions.length) {
                e.preventDefault()
                setSel((i) => (i <= 0 ? suggestions.length - 1 : i - 1))
              } else if (e.key === 'Enter') {
                go(sel >= 0 && suggestions[sel] ? suggestions[sel].url : addr)
                e.currentTarget.blur()
              } else if (e.key === 'Escape') {
                setAddr(nav.url)
                e.currentTarget.blur()
              }
            }}
          />
          <button
            disabled={start}
            title={starred ? t('br.bookmarkRemove') : t('br.bookmarkAdd')}
            aria-label={starred ? t('br.bookmarkRemove') : t('br.bookmarkAdd')}
            onClick={() => void lists.toggleBookmark(nav.url, nav.title)}
            className="absolute end-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-violet-200/60 transition hover:bg-white/10 disabled:opacity-30"
          >
            <Star size={16} className={starred ? 'fill-amber-300 text-amber-300' : ''} />
          </button>

          {overlay && (
            <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
              {suggestions.map((s, i) => (
                <button
                  key={s.url}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    go(s.url)
                    setEditing(false)
                  }}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-start transition ${
                    i === sel ? 'bg-brand/25' : 'hover:bg-white/5'
                  }`}
                >
                  {s.kind === 'bookmark' ? (
                    <Star size={14} className="shrink-0 text-amber-300" />
                  ) : (
                    <Clock size={14} className="shrink-0 text-brand-light/70" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm" dir="auto">
                      {s.title}
                    </span>
                    <span className="block truncate text-[11px] text-violet-300/50" dir="ltr">
                      {s.url}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          className={`btn-icon relative ${adBlock ? 'text-emerald-300' : 'text-violet-200/50'}`}
          title={
            adBlock
              ? t('br.adblockOn', { n: blocked }) +
                (tabs.adEngine === 'ready' ? '' : ' — ' + t(tabs.adEngine === 'offline' ? 'br.adblockOffline' : 'br.adblockLoading'))
              : t('br.adblockOff')
          }
          aria-label={t('br.adblock')}
          aria-pressed={adBlock}
          onClick={() => void updateSettings({ adBlock: !adBlock })}
        >
          {adBlock ? <ShieldCheck size={18} /> : <ShieldOff size={18} />}
          {adBlock && blocked > 0 && (
            <span className="absolute -end-1 -top-1 min-w-4 rounded-full bg-emerald-400 px-1 text-center text-[10px] font-bold leading-4 text-emerald-950">
              {blocked > 99 ? '99+' : blocked}
            </span>
          )}
        </button>
        <button
          className={`btn-icon ${panel && panelTab === 'bookmarks' ? 'bg-brand/25 text-white' : ''}`}
          title={t('br.bookmarks')}
          aria-label={t('br.bookmarks')}
          onClick={() => showPanel('bookmarks')}
        >
          <BookMarked size={18} />
        </button>
        <button
          className={`btn-icon ${panel && panelTab === 'history' ? 'bg-brand/25 text-white' : ''}`}
          title={t('br.history')}
          aria-label={t('br.history')}
          onClick={() => showPanel('history')}
        >
          <History size={18} />
        </button>
        <button
          className={`!px-3 !py-2 ${pageSite ? 'btn-primary shadow-glow' : 'btn-ghost'}`}
          disabled={start}
          onClick={analyzePage}
          title={t('br.analyzePageHint')}
        >
          <ScanSearch size={16} /> {t('br.analyzePage')}
        </button>
        <button
          onClick={() => showPanel('media')}
          className={`btn !px-3.5 !py-2 ${
            (panel && panelTab === 'media') || sniffed.length
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
          {(start || overlay) && (
            <div className="flex h-full flex-col items-center overflow-y-auto px-8 py-10 text-center">
              {start && (
                <>
                  <div className="mb-5 flex h-20 w-20 animate-float items-center justify-center rounded-3xl bg-gradient-to-br from-brand-deep/50 to-brand-pink/25 text-brand-light shadow-glow">
                    <Globe size={38} />
                  </div>
                  <h1 className="text-2xl font-extrabold">{t('br.startTitle')}</h1>
                  <p className="mb-8 mt-2 max-w-md text-violet-200/60">{t('br.startHint')}</p>
                  <StartPage onOpen={go} bookmarks={lists.bookmarks} visits={lists.visits} />
                </>
              )}
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
              <BrowserPanel
                tab={panelTab}
                onTab={setPanelTab}
                onClose={() => setPanel(false)}
                navTitle={nav.title}
                pageSite={pageSite}
                onAnalyzePage={analyzePage}
                sniffed={sniffed}
                onDownload={download}
                onClearMedia={() => void api.clearSniffed()}
                bookmarks={lists.bookmarks}
                visits={lists.visits}
                onOpen={go}
                onRemoveBookmark={(id) => void lists.removeBookmark(id)}
                onRemoveVisit={(url) => void lists.removeVisit(url)}
                onClearVisits={() => void lists.clearVisits()}
              />
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
