import { motion } from 'framer-motion'
import { Download, Globe, Home, Library, Settings as Cog } from 'lucide-react'
import { useT } from '@/i18n'
import { useApp, type Page } from '@/store/app'

const items: { page: Page; icon: typeof Home; key: string }[] = [
  { page: 'home', icon: Home, key: 'nav.home' },
  { page: 'browser', icon: Globe, key: 'nav.browser' },
  { page: 'downloads', icon: Download, key: 'nav.downloads' },
  { page: 'library', icon: Library, key: 'nav.library' },
  { page: 'settings', icon: Cog, key: 'nav.settings' }
]

export function Sidebar(): React.JSX.Element {
  const t = useT()
  const { page, setPage, binary, downloads } = useApp()
  const active = Object.values(downloads).filter(
    (d) => d.status === 'downloading' || d.status === 'processing' || d.status === 'queued'
  ).length

  return (
    <aside className="flex w-60 shrink-0 flex-col border-e border-line bg-surface/50 px-4 pb-4 pt-14 backdrop-blur-xl">
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-deep to-brand-pink shadow-glow">
          <Download size={20} strokeWidth={2.6} />
        </div>
        <div className="leading-tight">
          <div className="font-bold tracking-tight" dir="ltr">
            StreamPull
          </div>
          <div className="text-[11px] text-violet-300/60">{t('app.tagline')}</div>
        </div>
      </div>

      <nav className="space-y-1">
        {items.map(({ page: p, icon: Icon, key }) => {
          const on = page === p
          return (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`relative flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors ${
                on ? 'text-white' : 'text-violet-200/65 hover:bg-white/5 hover:text-white'
              }`}
            >
              {on && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-xl border border-brand-light/30 bg-gradient-to-br from-brand-deep/55 to-brand/25 shadow-[0_0_24px_-6px_rgb(var(--brand)/.7)]"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <Icon size={19} className="relative" />
              <span className="relative flex-1 text-start">{t(key)}</span>
              {p === 'downloads' && active > 0 && (
                <span className="relative min-w-5 rounded-full bg-brand-pink px-1.5 text-center text-[11px] font-bold leading-5 text-bg">
                  {active}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="mt-auto rounded-xl border border-line bg-white/[0.03] px-3 py-2.5 text-xs">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              binary.phase === 'ready'
                ? 'bg-ok shadow-[0_0_8px_#34d399]'
                : binary.phase === 'error'
                  ? 'bg-bad'
                  : 'animate-pulse bg-warn'
            }`}
          />
          <span className="text-violet-200/80">
            {binary.phase === 'ready'
              ? t('bin.ready')
              : binary.phase === 'error'
                ? t('bin.error')
                : binary.phase === 'downloading'
                  ? t('bin.downloading', { p: binary.percent, item: binary.item ?? '' })
                  : t('bin.checking')}
          </span>
        </div>
        {binary.phase === 'ready' && (
          <div className="mt-1 ps-4 text-[10px] text-violet-300/40" dir="ltr">
            yt-dlp {binary.version}
          </div>
        )}
      </div>
    </aside>
  )
}
