import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173 },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Keep the landing page light: heavy dashboard libs live in their own chunks.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (/recharts|d3-|victory-vendor|decimal\.js-light/.test(id)) return 'charts'
          if (/framer-motion|motion-dom|motion-utils/.test(id)) return 'motion'
          if (/@supabase/.test(id)) return 'supabase'
          // Tiny libs shared with recharts go with React so the charts chunk never loads on the landing page.
          if (/[\\/](react|react-dom|react-router|react-router-dom|scheduler|clsx|react-is|prop-types|tiny-invariant|eventemitter3)[\\/]/.test(id)) return 'react'
          return undefined
        },
      },
    },
  },
})
