import { Globe, Loader2, Plus, X } from 'lucide-react'
import type { BrowserTabsState } from '@shared/types'
import { hostOf } from '@shared/bookmarks'
import { useT } from '@/i18n'

export default function TabStrip({ state }: { state: BrowserTabsState }): React.JSX.Element {
  const t = useT()
  const api = window.api
  return (
    <div className="drag relative z-50 flex h-11 items-end gap-1 overflow-x-auto border-b border-line bg-surface/40 px-2 pt-1.5 ltr:pe-36">
      {state.tabs.map((tab) => {
        const on = tab.id === state.activeId
        const label = tab.title || (tab.url ? hostOf(tab.url) : '') || t('br.blankTab')
        return (
          <div
            key={tab.id}
            role="tab"
            aria-selected={on}
            onClick={() => void api.browserSwitchTab(tab.id)}
            onAuxClick={(e) => {
              if (e.button === 1) void api.browserCloseTab(tab.id)
            }}
            title={label}
            className={`no-drag group flex min-w-0 max-w-[220px] flex-1 basis-[150px] cursor-pointer items-center gap-2 rounded-t-xl border border-b-0 px-3 py-2 text-xs transition ${
              on
                ? 'border-line bg-surface text-white'
                : 'border-transparent text-violet-200/60 hover:bg-white/5 hover:text-violet-100'
            }`}
          >
            {tab.loading ? (
              <Loader2 size={13} className="shrink-0 animate-spin text-brand-light" />
            ) : (
              <Globe size={13} className="shrink-0 text-brand-light/70" />
            )}
            <span className="min-w-0 flex-1 truncate" dir="auto">
              {label}
            </span>
            {tab.media > 0 && (
              <span className="shrink-0 rounded-full bg-brand px-1.5 text-[10px] font-bold leading-4 text-white">
                {tab.media}
              </span>
            )}
            <button
              aria-label={t('br.closeTab')}
              title={t('br.closeTab')}
              onClick={(e) => {
                e.stopPropagation()
                void api.browserCloseTab(tab.id)
              }}
              className="shrink-0 rounded-md p-0.5 text-violet-200/50 opacity-70 transition hover:bg-white/10 hover:text-white group-hover:opacity-100"
            >
              <X size={13} />
            </button>
          </div>
        )
      })}
      <button
        className="btn-icon no-drag mb-1 h-8 w-8 shrink-0"
        title={t('br.newTab')}
        aria-label={t('br.newTab')}
        onClick={() => void api.browserNewTab()}
      >
        <Plus size={16} />
      </button>
    </div>
  )
}
