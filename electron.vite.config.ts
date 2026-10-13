import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

const shared = { '@shared': resolve('src/shared') }

export default defineConfig({
  main: { resolve: { alias: shared } },
  preload: { resolve: { alias: shared } },
  renderer: {
    root: 'src/renderer',
    plugins: [react()],
    resolve: { alias: { ...shared, '@': resolve('src/renderer/src') } }
  }
})
