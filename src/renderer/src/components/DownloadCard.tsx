import { motion } from 'framer-motion'
import {
  AlertCircle,
  CheckCircle2,
  FolderOpen,
  Pause,
  Play,
  RotateCcw,
  Trash2,
  X,
  Clock,
  Loader2
} from 'lucide-react'
import type { DownloadItem } from '@shared/types'
import { useT } from '@/i18n'
import { formatBytes, formatDuration, formatSpeed, qualityLabel } from '@/lib/format'
import { ProgressRing } from './ProgressRing'
import { Thumb } from './Thumb'

const isLive = (s: DownloadItem['status']): boolean => s === 'downloading' || s === 'processing'

export function DownloadCard({ item }: { item: DownloadItem }): React.JSX.Element {
  const t = useT()
  const api = window.api
  const { status } = item
  const audio = item.quality === 'mp3' || item.quality === 'm4a'
  const pct = Math.round(item.percent)

  const statusColor =
    status === 'completed'
      ? 'text-ok'
      : status === 'error'
        ? 'text-bad'
        : status === 'canceled'
          ? 'text-violet-300/50'
          : status === 'paused' || status === 'queued'
            ? 'text-warn'
            : 'text-brand-light'

  const StatusIcon =
    status === 'completed'
      ? CheckCircle2
      : status === 'error'
        ? AlertCircle
        : status === 'queued' || status === 'paused'
          ? Clock
          : status === 'canceled'
            ? X
            : Loader2

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="card flex items-center gap-4 p-3.5"
    >
      <Thumb src={item.thumbnail} audio={audio} duration={item.duration} className="w-36">
        {isLive(status) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/35">
            <div className="relative">
              <ProgressRing percent={status === 'processing' ? 100 : item.percent} />
              <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold tabular-nums">
                {status === 'processing' ? <Loader2 size={15} className="animate-spin" /> : pct}
              </span>
            </div>
          </div>
        )}
      </Thumb>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-semibold" dir="auto" title={item.title}>
            {item.title}
          </h3>
          <span className="chip shrink-0 !px-2 !py-0.5 text-[10px]">{qualityLabel(item.quality, t('media.best'))}</span>
        </div>

        <div className={`mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs ${statusColor}`}>
          <span className="inline-flex items-center gap-1.5 font-medium">
            <StatusIcon size={13} className={status === 'downloading' || status === 'processing' ? 'animate-spin' : ''} />
            {t(`dl.status.${status}`)}
          </span>
          {status === 'downloading' && (
            <>
              <span className="tabular-nums text-violet-200/70" dir="ltr">
                {formatBytes(item.downloadedBytes)}
                {item.totalBytes ? ` / ${formatBytes(item.totalBytes)}` : ''}
              </span>
              <span className="tabular-nums text-violet-200/70" dir="ltr">
                {formatSpeed(item.speed)}
              </span>
              {item.eta != null && (
                <span className="tabular-nums text-violet-200/70">{t('dl.left', { t: formatDuration(item.eta) })}</span>
              )}
            </>
          )}
          {status === 'completed' && item.totalBytes ? (
            <span className="tabular-nums text-violet-200/70" dir="ltr">
              {formatBytes(item.totalBytes)}
            </span>
          ) : null}
          {status === 'error' && (
            <span className="text-bad/90">{t(`err.${item.error ?? 'unknown'}`)}</span>
          )}
        </div>

        {(isLive(status) || status === 'paused' || status === 'queued') && (
          <div className="relative mt-2.5 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full bg-gradient-to-r from-brand-deep via-brand to-brand-pink transition-[width] duration-300 ${
                status === 'paused' ? 'opacity-50' : ''
              }`}
              style={{ width: `${status === 'processing' ? 100 : Math.max(item.percent, status === 'queued' ? 0 : 2)}%` }}
            />
            {status === 'downloading' && (
              <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/25 to-transparent" />
            )}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {status === 'downloading' && (
          <button className="btn-icon" title={t('dl.pause')} onClick={() => api.pause(item.id)}>
            <Pause size={17} />
          </button>
        )}
        {status === 'queued' && (
          <button className="btn-icon" title={t('dl.pause')} onClick={() => api.pause(item.id)}>
            <Pause size={17} />
          </button>
        )}
        {status === 'paused' && (
          <button className="btn-icon" title={t('dl.resume')} onClick={() => api.resume(item.id)}>
            <Play size={17} />
          </button>
        )}
        {(status === 'error' || status === 'canceled') && (
          <button className="btn-icon" title={t('dl.retry')} onClick={() => api.retry(item.id)}>
            <RotateCcw size={17} />
          </button>
        )}
        {status === 'completed' && (
          <>
            <button className="btn-icon" title={t('dl.open')} onClick={() => api.openFile(item.id)}>
              <Play size={17} />
            </button>
            <button className="btn-icon" title={t('dl.folder')} onClick={() => api.showInFolder(item.id)}>
              <FolderOpen size={17} />
            </button>
          </>
        )}
        {(isLive(status) || status === 'queued' || status === 'paused') && (
          <button className="btn-icon hover:!text-bad" title={t('dl.cancel')} onClick={() => api.cancel(item.id)}>
            <X size={17} />
          </button>
        )}
        {(status === 'completed' || status === 'error' || status === 'canceled') && (
          <button className="btn-icon hover:!text-bad" title={t('dl.remove')} onClick={() => api.removeFromQueue(item.id)}>
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </motion.div>
  )
}
