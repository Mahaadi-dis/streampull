import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, DownloadCloud } from 'lucide-react'
import { useT } from '@/i18n'
import { useApp } from '@/store/app'

export function EngineBanner(): React.JSX.Element {
  const t = useT()
  const binary = useApp((s) => s.binary)
  const setPage = useApp((s) => s.setPage)
  const show = binary.phase === 'downloading' || binary.phase === 'error'
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-5 overflow-hidden"
        >
          <div
            className={`flex items-center gap-3 rounded-2xl border p-4 text-sm ${
              binary.phase === 'error' ? 'border-bad/30 bg-bad/10' : 'border-brand-light/30 bg-brand/10'
            }`}
          >
            {binary.phase === 'error' ? (
              <AlertTriangle size={20} className="shrink-0 text-bad" />
            ) : (
              <DownloadCloud size={20} className="shrink-0 animate-float text-brand-light" />
            )}
            <div className="flex-1">
              <div className="font-semibold">
                {binary.phase === 'error' ? t('bin.error') : t('bin.firstRun', { item: binary.item ?? '' })}
              </div>
              {binary.phase === 'downloading' && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-deep to-brand-pink transition-[width]"
                    style={{ width: `${binary.percent}%` }}
                  />
                </div>
              )}
              {binary.phase === 'error' && (
                <div className="mt-1 text-xs text-red-200/60" dir="ltr">
                  {binary.message}
                </div>
              )}
            </div>
            {binary.phase === 'error' && (
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                <button className="btn-ghost" onClick={() => window.api.updateYtdlp()}>
                  {t('bin.retry')}
                </button>
                <button className="btn-ghost" onClick={() => setPage('settings')}>
                  {t('bin.diag')}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
