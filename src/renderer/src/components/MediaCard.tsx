import { useState } from 'react'
import { motion } from 'framer-motion'
import { Download, Globe, User, X } from 'lucide-react'
import type { MediaInfo, QualityKey } from '@shared/types'
import { useT } from '@/i18n'
import { formatBytes } from '@/lib/format'
import { useApp } from '@/store/app'
import { QualityPicker } from './QualityPicker'
import { Thumb } from './Thumb'

export function MediaCard({ info }: { info: MediaInfo }): React.JSX.Element {
  const t = useT()
  const { settings, enqueue, toast, clearAnalysis } = useApp()
  const initial = info.options.some((o) => o.key === settings?.defaultQuality)
    ? (settings?.defaultQuality as string)
    : 'best'
  const [quality, setQuality] = useState<QualityKey>(initial)
  const selected = info.options.find((o) => o.key === quality)

  const download = async (): Promise<void> => {
    await enqueue([
      {
        url: info.url,
        title: info.title,
        thumbnail: info.thumbnail,
        duration: info.duration,
        uploader: info.uploader,
        quality,
        expectedBytes: selected?.sizeBytes,
        cookieUrl: info.cookieUrl
      }
    ])
    toast(t('media.added'), 'ok')
    clearAnalysis()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      className="card relative flex gap-6 p-5"
    >
      <button onClick={clearAnalysis} className="btn-icon absolute end-3 top-3 h-8 w-8" aria-label={t('common.close')}>
        <X size={16} />
      </button>
      <Thumb src={info.thumbnail} duration={info.duration} className="w-72 self-start shadow-card" />
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="pe-8">
          <h2 className="line-clamp-2 text-lg font-bold leading-snug" dir="auto">
            {info.title}
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {info.uploader && (
              <span className="chip" dir="auto">
                <User size={12} /> {info.uploader}
              </span>
            )}
            {info.site && (
              <span className="chip">
                <Globe size={12} /> {info.site}
              </span>
            )}
          </div>
        </div>
        <QualityPicker options={info.options} value={quality} onChange={setQuality} />
        <div className="mt-auto flex items-center justify-between gap-4 pt-1">
          <span className="text-sm text-violet-300/70" dir="ltr">
            {selected?.sizeBytes ? t('media.size', { size: formatBytes(selected.sizeBytes) }) : ''}
          </span>
          <button className="btn-primary px-7 py-3 text-base" onClick={download}>
            <Download size={18} /> {t('media.download')}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
