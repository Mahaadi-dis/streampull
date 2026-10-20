import { useEffect, useState } from 'react'
import { Check, ClipboardCopy, Download, ExternalLink, FolderOpen, Info, Loader2, RefreshCw, Stethoscope, Trash2 } from 'lucide-react'
import { THEMES } from '@shared/themes'
import type { Lang, NameTemplate } from '@shared/types'
import type { UpdateCheck } from '@shared/release'
import { useT } from '@/i18n'
import { qualityLabel } from '@/lib/format'
import { useApp } from '@/store/app'

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-line py-4 last:border-0">
      <div className="min-w-0">
        <div className="text-sm font-semibold">{label}</div>
        {hint && <div className="mt-0.5 text-xs text-violet-300/55">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Segmented<T extends string>({
  value,
  options,
  onChange
}: {
  value: T
  options: { key: T; label: string }[]
  onChange: (v: T) => void
}): React.JSX.Element {
  return (
    <div className="flex rounded-xl border border-line bg-white/[0.03] p-1">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
            value === o.key ? 'bg-brand/80 text-white shadow-glow' : 'text-violet-200/65 hover:text-white'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <section className="mb-6">
      <h2 className="mb-2 px-1 text-sm font-bold text-brand-light">{title}</h2>
      <div className="card px-5">{children}</div>
    </section>
  )
}

const REPO_URL = 'https://github.com/Mahaadi-dis/streampull'

/** Version, "check for updates", developer and source links. */
function About(): React.JSX.Element {
  const t = useT()
  const [version, setVersion] = useState('')
  const [check, setCheck] = useState<'idle' | 'checking' | UpdateCheck>('idle')

  useEffect(() => {
    void window.api.appVersion().then(setVersion)
  }, [])

  const run = async (): Promise<void> => {
    setCheck('checking')
    setCheck(await window.api.checkForUpdateNow().catch((): UpdateCheck => ({ status: 'error' })))
  }

  const message =
    check === 'idle' || check === 'checking'
      ? undefined
      : check.status === 'latest'
        ? t('about.latest')
        : check.status === 'newer'
          ? t('about.newer', { version: check.info.version })
          : t('about.error')

  return (
    <Section title={t('about.title')}>
      <Row label={t('about.version')} hint={message}>
        <div className="flex items-center gap-3">
          <span className="chip" dir="ltr">
            {version ? `v${version}` : '—'}
          </span>
          {typeof check === 'object' && check.status === 'newer' && (
            <button className="btn-primary" onClick={() => void window.api.openExternal(check.info.url)}>
              <Download size={16} /> {t('about.get')}
            </button>
          )}
          <button className="btn-ghost" onClick={() => void run()} disabled={check === 'checking'}>
            {check === 'checking' ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            {check === 'checking' ? t('about.checking') : t('about.check')}
          </button>
        </div>
      </Row>
      <Row label={t('about.source')}>
        <button className="btn-ghost" onClick={() => void window.api.openExternal(REPO_URL)}>
          <ExternalLink size={16} /> <span dir="ltr">Mahaadi-dis/streampull</span>
        </button>
      </Row>
      <Row label={t('about.license')}>
        <span className="chip" dir="ltr">
          MIT
        </span>
      </Row>
    </Section>
  )
}

export default function Settings(): React.JSX.Element | null {
  const t = useT()
  const { settings, updateSettings, binary, toast } = useApp()
  const [updating, setUpdating] = useState(false)
  const [diag, setDiag] = useState('')
  const [diagBusy, setDiagBusy] = useState(false)
  if (!settings) return null

  const pickFolder = async (): Promise<void> => {
    const dir = await window.api.chooseFolder()
    if (dir) await updateSettings({ downloadDir: dir })
  }

  const update = async (): Promise<void> => {
    setUpdating(true)
    try {
      await window.api.updateYtdlp()
    } finally {
      setUpdating(false)
    }
  }

  const runDiag = async (): Promise<void> => {
    setDiagBusy(true)
    try {
      setDiag(await window.api.runDiagnostics())
    } finally {
      setDiagBusy(false)
    }
  }

  const speeds = ['', '500K', '1M', '2M', '5M', '10M']
  const qualities = ['best', '2160', '1440', '1080', '720', '480', '360', 'mp3', 'm4a']

  return (
    <div className="mx-auto max-w-3xl px-8 pb-10 pt-6">
      <h1 className="mb-6 text-2xl font-extrabold">{t('set.title')}</h1>

      <Section title={t('set.appearance')}>
        <div className="py-4">
          <div className="mb-3">
            <div className="text-sm font-semibold">{t('set.theme')}</div>
            <div className="mt-0.5 text-xs text-violet-300/55">{t('set.themeHint')}</div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {THEMES.map((th) => {
              const active = settings.theme === th.id
              const rgb = (c: readonly number[], a?: number): string =>
                `rgb(${c.join(' ')}${a !== undefined ? ` / ${a}` : ''})`
              return (
                <button
                  key={th.id}
                  aria-pressed={active}
                  onClick={() => updateSettings({ theme: th.id })}
                  className={`rounded-xl border p-2.5 text-start transition active:scale-[0.97] ${
                    active ? 'border-brand-light/70 shadow-glow' : 'border-line hover:border-brand-light/40'
                  }`}
                >
                  <div className="relative h-16 overflow-hidden rounded-lg" style={{ background: rgb(th.bg) }}>
                    <div className="absolute inset-y-0 start-0 w-1/4" style={{ background: rgb(th.surface) }} />
                    <div
                      className="absolute start-[32%] top-3 h-2 w-1/2 rounded-full"
                      style={{ background: `linear-gradient(90deg, ${rgb(th.brandDeep)}, ${rgb(th.accent2)})` }}
                    />
                    <div
                      className="absolute start-[32%] top-8 h-6 w-[60%] rounded-md border"
                      style={{ background: rgb(th.surface2), borderColor: rgb(th.brandLight, 0.25) }}
                    />
                    {active && (
                      <span
                        className="absolute end-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-white"
                        style={{ background: rgb(th.brand) }}
                      >
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm font-medium">
                    <span className="h-3 w-3 rounded-full" style={{ background: rgb(th.brand) }} />
                    {t(`theme.${th.id}`)}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </Section>

      <Section title={t('set.general')}>
        <Row label={t('set.language')}>
          <Segmented<Lang>
            value={settings.lang}
            onChange={(lang) => updateSettings({ lang })}
            options={[
              { key: 'ar', label: 'العربية' },
              { key: 'en', label: 'English' }
            ]}
          />
        </Row>
        <Row label={t('set.folder')} hint={settings.downloadDir}>
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => window.api.openDownloadDir()}>
              <FolderOpen size={16} /> {t('set.openFolder')}
            </button>
            <button className="btn-primary" onClick={pickFolder}>
              {t('set.change')}
            </button>
          </div>
        </Row>
        <Row label={t('set.checkUpdates')} hint={t('set.checkUpdatesHint')}>
          <button
            role="switch"
            aria-checked={settings.checkUpdates}
            onClick={() => updateSettings({ checkUpdates: !settings.checkUpdates })}
            className={`relative h-7 w-12 rounded-full transition ${
              settings.checkUpdates ? 'bg-gradient-to-r from-brand-deep to-brand-pink shadow-glow' : 'bg-white/10'
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
                settings.checkUpdates ? 'start-6' : 'start-1'
              }`}
            />
          </button>
        </Row>
        <Row label={t('set.notifications')}>
          <button
            role="switch"
            aria-checked={settings.notifications}
            onClick={() => updateSettings({ notifications: !settings.notifications })}
            className={`relative h-7 w-12 rounded-full transition ${
              settings.notifications ? 'bg-gradient-to-r from-brand-deep to-brand-pink shadow-glow' : 'bg-white/10'
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
                settings.notifications ? 'start-6' : 'start-1'
              }`}
            />
          </button>
        </Row>
      </Section>

      <Section title={t('set.downloads')}>
        <Row label={t('set.concurrency')}>
          <div className="flex items-center gap-3" dir="ltr">
            <input
              type="range"
              min={1}
              max={8}
              value={settings.concurrency}
              onChange={(e) => updateSettings({ concurrency: Number(e.target.value) })}
              className="w-40 accent-brand"
            />
            <span className="w-5 text-center text-sm font-bold tabular-nums">{settings.concurrency}</span>
          </div>
        </Row>
        <Row label={t('set.defaultQuality')}>
          <select
            className="input !w-auto !py-2"
            value={settings.defaultQuality}
            onChange={(e) => updateSettings({ defaultQuality: e.target.value })}
          >
            {qualities.map((q) => (
              <option key={q} value={q} className="bg-surface">
                {qualityLabel(q, t('media.best'))}
              </option>
            ))}
          </select>
        </Row>
        <Row label={t('set.nameTemplate')}>
          <select
            className="input !w-auto !py-2"
            value={settings.nameTemplate}
            onChange={(e) => updateSettings({ nameTemplate: e.target.value as NameTemplate })}
          >
            {(['title', 'uploader-title', 'title-id'] as NameTemplate[]).map((n) => (
              <option key={n} value={n} className="bg-surface">
                {t(`set.name.${n}`)}
              </option>
            ))}
          </select>
        </Row>
        <Row label={t('set.speedLimit')}>
          <select
            className="input !w-auto !py-2"
            value={settings.speedLimit}
            onChange={(e) => updateSettings({ speedLimit: e.target.value })}
          >
            {speeds.map((s) => (
              <option key={s} value={s} className="bg-surface">
                {s ? `${s.replace('K', ' KB/s').replace('M', ' MB/s')}` : t('set.unlimited')}
              </option>
            ))}
          </select>
        </Row>
      </Section>

      <Section title={t('set.browser')}>
        <Row label={t('set.adBlock')} hint={t('set.adBlockHint')}>
          <button
            role="switch"
            aria-checked={settings.adBlock}
            onClick={() => updateSettings({ adBlock: !settings.adBlock })}
            className={`relative h-7 w-12 rounded-full transition ${
              settings.adBlock ? 'bg-gradient-to-r from-brand-deep to-brand-pink shadow-glow' : 'bg-white/10'
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
                settings.adBlock ? 'start-6' : 'start-1'
              }`}
            />
          </button>
        </Row>
        <Row label={t('set.clearHistory')} hint={t('set.clearHistoryHint')}>
          <button
            className="btn-ghost"
            onClick={async () => {
              await window.api.visitsClear()
              toast(t('set.cleared'), 'ok')
            }}
          >
            <Trash2 size={16} /> {t('set.clear')}
          </button>
        </Row>
        <Row label={t('set.clearSiteData')} hint={t('set.clearSiteDataHint')}>
          <button
            className="btn-ghost"
            onClick={async () => {
              if (!window.confirm(t('set.clearSiteDataConfirm'))) return
              await window.api.browserClearSiteData()
              toast(t('set.cleared'), 'ok')
            }}
          >
            <Trash2 size={16} /> {t('set.clear')}
          </button>
        </Row>
      </Section>

      <Section title={t('set.engine')}>
        <Row
          label={t('set.engineVersion')}
          hint={t('set.engineHint')}
        >
          <div className="flex items-center gap-3">
            <span className="chip" dir="ltr">
              {binary.phase === 'ready' ? binary.version : '—'}
            </span>
            <button className="btn-ghost" onClick={update} disabled={updating || binary.phase === 'downloading'}>
              {updating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              {updating ? t('set.updating') : t('set.update')}
            </button>
          </div>
        </Row>
        <Row label={t('set.diag')} hint={t('set.diagHint')}>
          <button className="btn-ghost" onClick={runDiag} disabled={diagBusy}>
            {diagBusy ? <Loader2 size={16} className="animate-spin" /> : <Stethoscope size={16} />}
            {diagBusy ? t('set.diagRunning') : t('set.diagRun')}
          </button>
        </Row>
        {diag && (
          <div className="pb-4">
            <textarea
              readOnly
              dir="ltr"
              value={diag}
              className="h-56 w-full resize-y rounded-xl border border-line bg-black/30 p-3 font-mono text-[11px] leading-relaxed text-violet-100/80 outline-none"
            />
            <button
              className="btn-ghost mt-2"
              onClick={() => {
                void window.api.copyText(diag)
                toast(t('set.diagCopied'), 'ok')
              }}
            >
              <ClipboardCopy size={16} /> {t('set.diagCopy')}
            </button>
          </div>
        )}
      </Section>

      <About />

      <div className="flex gap-3 rounded-2xl border border-line bg-white/[0.03] p-4 text-xs leading-relaxed text-violet-200/55">
        <Info size={18} className="mt-0.5 shrink-0 text-brand-light" />
        <div>
          <div className="mb-0.5 font-semibold text-violet-100">{t('set.about')}</div>
          {t('set.disclaimer')}
        </div>
      </div>
    </div>
  )
}
