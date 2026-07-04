import path from 'node:path'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      // Same-origin route to the screenshot CDN — the bucket doesn't send
      // CORS headers, so blob downloads go through here. Mirror this rule
      // (or enable CORS on the bucket) in production.
      '/cdn': {
        target: 'https://screenshots.elmehdi.space',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/cdn/, ''),
      },
    },
  },
})
