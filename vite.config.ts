// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'autoUpdate' = deploys silently replace the cached service worker
      // on next visit, so users never see a stale broken version.
      registerType: 'autoUpdate',
      manifest: {
        name: 'Campus RoomLynk',
        short_name: 'RoomLynk',
        description: "Uganda's direct student-landlord housing marketplace",
        theme_color: '#031D4E',
        background_color: '#F7F8FA',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        // Cache room photos and room-list API responses so browsing still
        // works on patchy campus wifi — a real design goal, not a nice-to-have.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'room-photos-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /\/api\/rooms(\?.*)?$/,
            handler: 'NetworkFirst',
            options: { cacheName: 'rooms-api-cache' },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': '/src' },
  },
  server: {
    port: 5173,
    // In dev, forwards /api/* to your Next.js backend once it exists.
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
});