import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    entries: ['index.html'],
  },
  resolve: {
    alias: {
      'animejs': 'animejs/lib/anime.es.js',
    },
  },
  server: {
    cors: true,
    watch: {
      ignored: [
        '**/node_modules/**',
        '**/.venv/**',
        '**/public/models/**',
        '**/dist/**',
        '**/.git/**'
      ]
    }
  },
  worker: {
    format: 'es',
  },
  build: {
    target: 'es2020',
    emptyOutDir: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-pdf': ['pdf-lib', 'pdfjs-dist'],
          'vendor-doc': ['mammoth', 'jspdf', 'html2canvas'],
          'vendor-util': ['file-saver', 'jszip', 'qrcode'],
          'vendor-motion': ['framer-motion'],
        }
      }
    }
  }
})
