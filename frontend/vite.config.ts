import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'logo.png'],
      manifest: {
        name: 'El Perfumista Rubio',
        short_name: 'Perfumista Rubio',
        description:
          'Catálogo de perfumes, esencias y cuidado personal de El Perfumista Rubio. Consulta disponibilidad y escríbenos por WhatsApp.',
        lang: 'es',
        theme_color: '#08080a',
        background_color: '#08080a',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/pwa-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,webp,jpg,ico}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/media\//],
        runtimeCaching: [
          {
            urlPattern: /\/api\/(productos|familias|notas|config)/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'catalogo-api',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 120, maxAgeSeconds: 86400 },
            },
          },
          {
            urlPattern: /\/media\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'catalogo-imagenes',
              expiration: { maxEntries: 200, maxAgeSeconds: 2592000 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/media': 'http://127.0.0.1:8000',
    },
  },
})
