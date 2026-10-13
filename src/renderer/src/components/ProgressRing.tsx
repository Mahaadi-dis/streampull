export function ProgressRing({ percent, size = 44 }: { percent: number; size?: number }): React.JSX.Element {
  const r = (size - 6) / 2
  const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} className="-rotate-90">
      <defs>
        <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" style={{ stopColor: 'rgb(var(--brand-deep))' }} />
          <stop offset="100%" style={{ stopColor: 'rgb(var(--accent2))' }} />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} style={{ fill: 'rgb(var(--bg) / .65)' }} stroke="rgba(255,255,255,.14)" strokeWidth="3" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="url(#ring)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.min(100, Math.max(0, percent)) / 100)}
        style={{ transition: 'stroke-dashoffset .3s ease' }}
      />
    </svg>
  )
}
