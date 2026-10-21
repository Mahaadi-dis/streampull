import { useState } from 'react'
import { motion } from 'framer-motion'
import { Download, Globe, Scissors, User, X } from 'lucide-react'
import type { MediaInfo, QualityKey } from '@shared/types'
import { useT } from '@/i18n'
import { formatBytes } from '@/lib/format'
import { formatClipTime, parseClipTime, validateClip } from '@shared/downloadOptions'
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

  // Optional: only a part of the video. Blank "from" = the start, blank "to" = the end (when the length is known).
  const [clipOpen, setClipOpen] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const startSec = from.trim() === '' ? 0 : parseClipTime(from)
  const endSec = to.trim() === '' ? (info.duration ?? null) : parseClipTime(to)
  const clip = clipOpen && startSec !== null && endSec !== null ? validateClip(startSec, endSec, info.duration) : null
  const clipBad = clipOpen && !clip

  const download = async (): Promise<void> => {
    if (clipBad) return
    await enqueue([
      {
        url: info.url,
        title: info.title,
        thumbnail: info.thumbnail,
        duration: info.duration,
        uploader: info.uploader,
        quality,
        expectedBytes: selected?.sizeBytes,
        cookieUrl: info.cookieUrl,
        clip
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
        {settings?.clipEnabled && (
          <div>
            <button
              type="button"
              onClick={() => setClipOpen((o) => !o)}
              aria-expanded={clipOpen}
              className={`inline-flex items-center gap-2 text-sm font-medium transition ${
                clipOpen ? 'text-brand-light' : 'text-violet-200/65 hover:text-white'
              }`}
            >
              <Scissors size={15} /> {t('media.clip')}
            </button>
            {clipOpen && (
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-violet-200/70">
                  {t('media.clipFrom')}
                  <input
                    className="input !w-24 !py-1.5 text-center"
                    dir="ltr"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    placeholder="0:00"
                    aria-invalid={startSec === null}
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-violet-200/70">
                  {t('media.clipTo')}
                  <input
                    className="input !w-24 !py-1.5 text-center"
                    dir="ltr"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder={info.duration ? formatClipTime(info.duration) : '1:30'}
                    aria-invalid={endSec === null}
                  />
                </label>
                {clipBad && <span className="text-xs text-red-300/90">{t('media.clipInvalid')}</span>}
              </div>
            )}
          </div>
        )}
        <div className="mt-auto flex items-center justify-between gap-4 pt-1">
          <span className="text-sm text-violet-300/70" dir="ltr">
            {selected?.sizeBytes ? t('media.size', { size: formatBytes(clip && info.duration ? selected.sizeBytes * ((clip.end - clip.start) / info.duration) : selected.sizeBytes) }) : ''}
          </span>
          <button className="btn-primary px-7 py-3 text-base disabled:opacity-50" onClick={download} disabled={clipBad}>
            <Download size={18} /> {t('media.download')}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
