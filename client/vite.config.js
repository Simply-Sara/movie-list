import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: false // No sourcemaps in production
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: ['movies.meow-net.org'],
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})

