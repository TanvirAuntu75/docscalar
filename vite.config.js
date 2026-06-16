import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  worker: {
    format: 'es',
  },
  build: {
    target: 'es2020',
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
