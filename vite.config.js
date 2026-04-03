import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import { VitePWA } from 'vite-plugin-pwa' // Added this import

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)


export default defineConfig({
   server: {
    port: 5173,
    strictPort: true,
    allowedHosts: [
      'e24fbeaf-b042-4f59-abbb-23ca3343f799-00-upza3ll3riqy.pike.replit.dev',
      '.replit.dev',
      '.repl.co'
    ], // Explicitly allow Replit hosts
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    // ==========================================
    // PWA CONFIGURATION
    // ==========================================
   VitePWA({
  registerType: 'autoUpdate',
  devOptions: {
    enabled: true, // This generates the manifest/SW in development mode!
    type: 'module',
  },
  includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
  manifest: {
  // ... existing name, theme_color, etc.
  screenshots: [
    {
      src: '/pwa-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      form_factor: 'wide', // For Desktop Rich UI
      label: 'Angel Dry Cleaners Desktop'
    },
    {
      src: '/pwa-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      form_factor: 'narrow', // For Mobile Rich UI
      label: 'Angel Dry Cleaners Mobile'
    }
  ],
  icons: [
    {
      src: '/pwa-192x192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any' // This satisfies the "any" requirement
    },
    {
      src: '/pwa-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable'
    }
  ]
}
})
  ]
})