import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpCircle, X } from 'lucide-react'
import { useT } from '@/i18n'
import { useApp } from '@/store/app'

/** "A new version is available" card at the bottom of the sidebar. */
export function UpdateCard(): React.JSX.Element {
  const t = useT()
  const { update, dismissUpdate } = useApp()
  return (
    <AnimatePresence>
      {update && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="relative rounded-xl border border-brand-light/30 bg-gradient-to-br from-brand-deep/30 to-brand-pink/10 p-3 text-xs shadow-glow"
        >
          <button
            className="absolute end-1.5 top-1.5 rounded-md p-1 text-violet-200/50 transition hover:bg-white/10 hover:text-white"
            title={t('update.dismiss')}
            aria-label={t('update.dismiss')}
            onClick={dismissUpdate}
          >
            <X size={13} />
          </button>
          <div className="flex items-center gap-2 pe-5 font-semibold text-white">
            <ArrowUpCircle size={16} className="shrink-0 text-brand-light" />
            {t('update.available', { version: update.version })}
          </div>
          <button className="btn-primary mt-2.5 w-full !py-1.5 text-xs" onClick={() => void window.api.openExternal(update.url)}>
            {t('update.get')}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
