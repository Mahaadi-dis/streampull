import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { useApp } from '@/store/app'

export function Toasts(): React.JSX.Element {
  const toasts = useApp((s) => s.toasts)
  const dismiss = useApp((s) => s.dismissToast)
  const onBrowser = useApp((s) => s.page === 'browser')
  return (
    // The native browser view covers the page body, so toasts sit over the toolbar there.
    <div
      className={`pointer-events-none fixed inset-x-0 z-50 flex flex-col items-center gap-2 ${onBrowser ? 'top-14' : 'bottom-6'}`}
    >
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = t.tone === 'ok' ? CheckCircle2 : t.tone === 'error' ? AlertCircle : Info
          const color = t.tone === 'ok' ? 'text-ok' : t.tone === 'error' ? 'text-bad' : 'text-brand-light'
          return (
            <motion.button
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              onClick={() => dismiss(t.id)}
              className="card pointer-events-auto flex items-center gap-2.5 !bg-surface-2/95 px-4 py-3 text-sm font-medium shadow-glow"
            >
              <Icon size={18} className={color} />
              {t.text}
            </motion.button>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
