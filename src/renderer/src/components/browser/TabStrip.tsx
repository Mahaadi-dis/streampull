import { useLayoutEffect, useRef, useState } from 'react'
import { Globe, Loader2, Plus, X } from 'lucide-react'
import type { BrowserTabsState } from '@shared/types'
import { hostOf } from '@shared/bookmarks'
import { useT } from '@/i18n'

interface WindowControlsOverlay {
  visible: boolean
  getTitlebarAreaRect(): { x: number; width: number }
  addEventListener(type: 'geometrychange', cb: () => void): void
  removeEventListener(type: 'geometrychange', cb: () => void): void
}

/**
 * The window's own buttons (minimize / maximize / close) sit over this strip. They are on the right in most
 * Windows setups but on the LEFT when the system language is right-to-left (Arabic Windows), and the sidebar can be
 * on either side too — so ask the window where they are instead of assuming, and keep the tabs clear of them.
 */
function useControlsInset(el: React.RefObject<HTMLDivElement | null>): { left: number; right: number } {
  const [inset, setInset] = useState({ left: 0, right: 0 })
  useLayoutEffect(() => {
    const wco = (navigator as Navigator & { windowControlsOverlay?: WindowControlsOverlay }).windowControlsOverlay
    if (!wco?.visible) return
    const update = (): void => {
      const box = el.current?.getBoundingClientRect()
      if (!box) return
      const area = wco.getTitlebarAreaRect()
      setInset({
        left: Math.max(0, Math.round(area.x - box.left)),
        right: Math.max(0, Math.round(box.right - (area.x + area.width)))
      })
    }
    update()
    wco.addEventListener('geometrychange', update)
    window.addEventListener('resize', update)
    return () => {
      wco.removeEventListener('geometrychange', update)
      window.removeEventListener('resize', update)
    }
  }, [el])
  return inset
}

export default function TabStrip({ state }: { state: BrowserTabsState }): React.JSX.Element {
  const t = useT()
  const api = window.api
  const ref = useRef<HTMLDivElement>(null)
  const inset = useControlsInset(ref)
  return (
    <div
      ref={ref}
      style={{ paddingLeft: 8 + inset.left, paddingRight: 8 + inset.right }}
      className="drag relative z-50 flex h-11 items-end gap-1 overflow-x-auto border-b border-line bg-surface/40 pt-1.5"
    >
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
