import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    target: 'esnext',
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000000,
    cssCodeSplit: false,
    outDir: 'dist',
    rollupOptions: {
      inlineDynamicImports: true,
      output: {
        manualChunks: undefined,
      }
    },
    commonjsOptions: {
      transformMixedEsModules: true
    }
  },
  resolve: {
    dedupe: ['react', 'react-dom', 'firebase', 'firebase/database'],
    alias: {
      'react': 'react',
      'react-dom': 'react-dom'
    }
  },
  optimizeDeps: {
    exclude: ['firebase', 'firebase/database', 'firebase/app', 'firebase/auth']
  },
  server: {
    allowedHosts: ['buscia.systematrix.com.br'],
    port: 3000,
    host: '0.0.0.0'
  }
})
