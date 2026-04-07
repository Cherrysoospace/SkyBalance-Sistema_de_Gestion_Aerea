import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main:        resolve(__dirname, 'index.html'),
        gestion:     resolve(__dirname, 'pages/gestion-nodos.html'),
        comparacion: resolve(__dirname, 'pages/comparacion.html'),
      }
    }
  },
  server: {
    port: 5173,
    open: '/index.html'
  }
})
