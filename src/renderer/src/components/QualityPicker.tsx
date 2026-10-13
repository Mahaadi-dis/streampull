import { Film, Music } from 'lucide-react'
import type { QualityKey, QualityOption } from '@shared/types'
import { useT } from '@/i18n'
import { formatBytes, qualityLabel } from '@/lib/format'

interface Props {
  options: QualityOption[]
  value: QualityKey
  onChange: (k: QualityKey) => void
}

export function QualityPicker({ options, value, onChange }: Props): React.JSX.Element {
  const t = useT()
  const groups: { kind: 'video' | 'audio'; icon: typeof Film; title: string }[] = [
    { kind: 'video', icon: Film, title: t('media.video') },
    { kind: 'audio', icon: Music, title: t('media.audio') }
  ]
  return (
    <div className="space-y-3">
      {groups.map(({ kind, icon: Icon, title }) => {
        const list = options.filter((o) => o.kind === kind)
        if (!list.length) return null
        return (
          <div key={kind}>
            <div className="label mb-2 flex items-center gap-1.5">
              <Icon size={13} /> {title}
            </div>
            <div className="flex flex-wrap gap-2">
              {list.map((o) => {
                const active = o.key === value
                return (
                  <button
                    key={o.key}
                    onClick={() => onChange(o.key)}
                    className={`group rounded-xl border px-3.5 py-2 text-start transition duration-200 active:scale-95 ${
                      active
                        ? 'border-brand-light/70 bg-gradient-to-br from-brand-deep/90 to-brand/80 text-white shadow-glow'
                        : 'border-line bg-white/[0.04] text-violet-100 hover:border-brand-light/40 hover:bg-white/[0.08]'
                    }`}
                  >
                    <div className="text-sm font-semibold leading-tight">
                      {qualityLabel(o.key, t('media.best'))}
                    </div>
                    {o.sizeBytes ? (
                      <div className={`text-[11px] tabular-nums ${active ? 'text-white/80' : 'text-violet-300/60'}`} dir="ltr">
                        {formatBytes(o.sizeBytes)}
                      </div>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
