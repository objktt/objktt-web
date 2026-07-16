import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Local API functions: run `vercel dev --listen 3300` alongside `npm run dev`.
    // (vercel dev alone can't serve the SPA — the vercel.json catch-all rewrite
    // breaks vite module URLs — so vite serves the app and proxies /api here.)
    proxy: {
      '/api': 'http://localhost:3300',
    },
  },
})
