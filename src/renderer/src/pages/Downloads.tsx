import { AnimatePresence, motion } from 'framer-motion'
import { DownloadCloud, Eraser } from 'lucide-react'
import { useT } from '@/i18n'
import { useApp } from '@/store/app'
import { DownloadCard } from '@/components/DownloadCard'

export default function Downloads(): React.JSX.Element {
  const t = useT()
  const downloads = useApp((s) => s.downloads)
  const list = Object.values(downloads).sort((a, b) => b.createdAt - a.createdAt)
  const finished = list.some((d) => ['completed', 'error', 'canceled'].includes(d.status))

  return (
    <div className="mx-auto max-w-4xl px-8 pb-10 pt-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">{t('dl.title')}</h1>
        {finished && (
          <button className="btn-ghost" onClick={() => window.api.clearFinished()}>
            <Eraser size={16} /> {t('dl.clearFinished')}
          </button>
        )}
      </div>

      {list.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card flex flex-col items-center px-6 py-20 text-center"
        >
          <div className="mb-5 flex h-20 w-20 animate-float items-center justify-center rounded-3xl bg-gradient-to-br from-brand-deep/40 to-brand-pink/20 text-brand-light shadow-glow">
            <DownloadCloud size={38} />
          </div>
          <div className="text-lg font-bold">{t('dl.empty')}</div>
          <div className="mt-1 text-sm text-violet-200/55">{t('dl.emptyHint')}</div>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {list.map((d) => (
              <DownloadCard key={d.id} item={d} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
