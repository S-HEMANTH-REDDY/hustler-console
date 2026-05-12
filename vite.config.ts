import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const repo = 'hustler-console'

export default defineConfig({
  base: process.env.GITHUB_PAGES ? `/${repo}/` : '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Hustler',
        short_name: 'Hustler',
        description: 'Daily job-hunt console',
        theme_color: '#0A0A0B',
        background_color: '#0A0A0B',
        display: 'standalone',
        start_url: '.',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,ico,wasm}'],
      },
    }),
  ],
})
