import { Clock, ShieldCheck, Star } from 'lucide-react'
import type { Bookmark, Visit } from '@shared/bookmarks'
import { hostOf } from '@shared/bookmarks'
import { useT } from '@/i18n'
import { SITES } from '@/lib/sites'

const initial = (b: { title: string; url: string }): string => (b.title.trim() || hostOf(b.url)).charAt(0).toUpperCase()

/** What an empty tab shows: your bookmarks, popular sites and recently visited pages. */
export default function StartPage({
  onOpen,
  bookmarks,
  visits,
  compact
}: {
  onOpen: (url: string) => void
  bookmarks: Bookmark[]
  visits: Visit[]
  compact?: boolean
}): React.JSX.Element {
  const t = useT()
  const recent = visits.slice(0, compact ? 5 : 6)
  const cols = compact ? 'grid-cols-3' : 'grid-cols-5'
  const tile =
    'flex flex-col items-center gap-2 rounded-2xl border border-line bg-white/[0.03] px-2 py-4 transition active:scale-95 ' +
    (compact ? '' : 'hover:-translate-y-0.5 hover:border-brand-light/40 hover:bg-white/[0.07] hover:shadow-glow')

  return (
    <div className={`w-full ${compact ? '' : 'max-w-3xl'}`}>
      {bookmarks.length > 0 && (
        <section className="mb-7">
          <h2 className="mb-3 flex items-center gap-2 text-start text-sm font-bold text-violet-100">
            <Star size={15} className="text-amber-300" /> {t('br.bookmarks')}
          </h2>
          <div className={`grid gap-3 ${cols}`}>
            {bookmarks.slice(0, compact ? 6 : 10).map((b) => (
              <button key={b.id} onClick={() => onOpen(b.url)} className={tile} title={b.url}>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-deep to-brand text-lg font-extrabold text-white shadow-card">
                  {initial(b)}
                </span>
                <span className="w-full truncate text-xs font-medium text-violet-100" dir="auto">
                  {b.title}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className={`grid gap-3 ${cols}`}>
        {SITES.map((s) => (
          <button key={s.name} onClick={() => onOpen(s.url)} className={tile}>
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

      {recent.length > 0 && (
        <section className="mt-7">
          <h2 className="mb-3 flex items-center gap-2 text-start text-sm font-bold text-violet-100">
            <Clock size={15} className="text-brand-light" /> {t('br.recent')}
          </h2>
          <div className="space-y-1.5">
            {recent.map((v) => (
              <button
                key={v.url}
                onClick={() => onOpen(v.url)}
                className="flex w-full items-center gap-3 rounded-xl border border-line bg-white/[0.03] px-3 py-2.5 text-start transition hover:bg-white/[0.07] active:scale-[0.99]"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-sm font-bold text-brand-light">
                  {initial(v)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium" dir="auto">
                    {v.title}
                  </span>
                  <span className="block truncate text-[11px] text-violet-300/50" dir="ltr">
                    {hostOf(v.url)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="mt-7 flex items-center justify-center gap-2 text-xs text-violet-300/50">
        <ShieldCheck size={14} /> {t('br.loginNote')}
      </div>
    </div>
  )
}
