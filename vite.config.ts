import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const repo = 'hustler-console'

export default defineConfig({
  base: process.env.GITHUB_PAGES ? `/${repo}/` : '/',
  plugins: [react(), tailwindcss()],
  build: {
    // Split big, stable third-party libs into their own long-cached chunks so
    // the app shell stays small and vendor code isn't re-downloaded on deploys.
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          datefns: ['date-fns'],
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
})
