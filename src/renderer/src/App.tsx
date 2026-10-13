import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useApp } from '@/store/app'
import { Sidebar } from '@/components/Sidebar'
import { Toasts } from '@/components/Toasts'
import Home from '@/pages/Home'
import BrowserPage from '@/pages/Browser'
import Downloads from '@/pages/Downloads'
import Library from '@/pages/Library'
import Settings from '@/pages/Settings'

const pages = { home: Home, browser: BrowserPage, downloads: Downloads, library: Library, settings: Settings }

export default function App(): React.JSX.Element | null {
  const { page, settings, init } = useApp()

  useEffect(() => {
    void init()
  }, [init])

  useEffect(() => {
    if (!settings) return
    document.documentElement.lang = settings.lang
    document.documentElement.dir = settings.lang === 'ar' ? 'rtl' : 'ltr'
  }, [settings])

  if (!settings) return null
  const Page = pages[page]

  return (
    <div className="flex h-full">
      <div className="drag fixed inset-x-0 top-0 z-40 h-11" />
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto pt-11">
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0, y: page === 'browser' ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: page === 'browser' ? 0 : -6 }}
            transition={{ duration: 0.18 }}
          >
            <Page />
          </motion.div>
        </AnimatePresence>
      </main>
      <Toasts />
    </div>
  )
}
