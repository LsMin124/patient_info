import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    // 'hidden' emits .map files to disk for debugging tooling but omits the
    // sourceMappingURL comment, so the bundle does not advertise them and
    // crawlers / casual visitors do not auto-fetch them.
    sourcemap: 'hidden',
    target: 'es2022',
  },
})
