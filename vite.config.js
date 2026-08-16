import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// IMPORTANT: change "recipe-box" below to match your GitHub repo name
// e.g. if your repo is github.com/yourname/my-recipes, set base: '/my-recipes/'
export default defineConfig({
  base: '/recipe-box/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Recipe Box',
        short_name: 'RecipeBox',
        description: 'Your recipe collection, with smart recommendations',
        theme_color: '#2b4339',
        background_color: '#f6f1e7',
        display: 'standalone',
        start_url: '/recipe-box/',
        scope: '/recipe-box/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ]
});
