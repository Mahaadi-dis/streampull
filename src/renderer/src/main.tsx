import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

async function boot(): Promise<void> {
  // Plain-browser preview during development (no Electron preload available).
  // Optional query params for docs/screenshots: ?page=library&lang=en&analyze=<url>
  if (import.meta.env.DEV && !window.api) {
    const { mockApi } = await import('./lib/mockApi')
    window.api = mockApi
    const q = new URLSearchParams(location.search)
    const { useApp } = await import('./store/app')
    const lang = q.get('lang')
    if (lang === 'ar' || lang === 'en') await mockApi.setSettings({ lang })
    const page = q.get('page')
    if (page) useApp.setState({ page: page as never })
    const analyze = q.get('analyze')
    if (analyze) void useApp.getState().analyze(analyze)
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}

void boot()
