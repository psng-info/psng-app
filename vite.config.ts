import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

export default defineConfig({
  // Cache-Buster für den Lesecache: Version aus package.json, bei Vercel plus Commit.
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(
      process.env.VERCEL_GIT_COMMIT_SHA
        ? `${pkg.version}+${process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7)}`
        : pkg.version,
    ),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'PSNG Orga',
        short_name: 'PSNG',
        lang: 'de',
        theme_color: '#c94a6e',
        background_color: '#fdf7f9',
        display: 'standalone',
        start_url: '/#/talks',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Nur die App-Hülle vorab cachen, keine Laufzeit-Caches (insbesondere keine Google-URLs).
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,ico,webmanifest}'],
        // Nur woff2 vorab cachen (.woff nie), und die großen Installations-Icons weglassen:
        // Browser laden sie nur beim Installieren und brauchen sie nicht offline.
        globIgnores: [
          '**/*.woff',
          '**/icons/icon-512.png',
          '**/icons/maskable-512.png',
          '**/icons/apple-touch-icon.png',
        ],
        navigateFallback: 'index.html',
        // Die Function unter /api ist nie Teil der App-Hülle.
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [],
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
