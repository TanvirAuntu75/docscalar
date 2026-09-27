import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  base: './',
  plugins: [react()],
  optimizeDeps: {
    entries: ['index.html'],
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'framer-motion',
      'lucide-react',
      'pdf-lib',
      'pdfjs-dist',
      'xlsx',
      'jszip',
      'mammoth',
      'jspdf',
      'html2canvas',
      'qrcode',
      'animejs',
    ],
  },
  resolve: {
    alias: {
      'animejs': 'animejs/lib/anime.es.js',
      'file-saver$': path.resolve(__dirname, './src/utils/fileSaver.js'),
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
        '**/.git/**',
        '**/scripts/**',
        '**/repo_map.md'
      ]
    }
  },
  worker: {
    format: 'es',
  },
  build: {
    target: 'es2020',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-icons': ['lucide-react'],
          'vendor-motion': ['framer-motion'],
          'vendor-pdf': ['pdf-lib', 'pdfjs-dist'],
          'vendor-doc': ['mammoth', 'jspdf', 'html2canvas'],
          'vendor-sheet': ['xlsx'],
          'vendor-util': ['jszip', 'qrcode'],
        }
      }
    }
  }
})
