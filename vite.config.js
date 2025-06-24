import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        dashboard: 'dashboard.html',
        settings: 'settings.html'
      }
    }
  },
  server: {
    port: 5173,
    open: true
  }
})
