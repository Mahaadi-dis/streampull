import { useState } from 'react'
import { Film, Music } from 'lucide-react'
import { formatDuration } from '@/lib/format'

interface Props {
  src?: string | null
  duration?: number | null
  audio?: boolean
  className?: string
  children?: React.ReactNode
}

export function Thumb({ src, duration, audio, className = '', children }: Props): React.JSX.Element {
  const [failed, setFailed] = useState(false)
  const Icon = audio ? Music : Film
  return (
    <div
      className={`relative aspect-video shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-surface-3 to-surface-2 ${className}`}
    >
      {src && !failed ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-brand-light/50">
          <Icon size={28} />
        </div>
      )}
      {duration ? (
        <span className="absolute bottom-1.5 end-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-medium tabular-nums backdrop-blur">
          {formatDuration(duration)}
        </span>
      ) : null}
      {children}
    </div>
  )
}
