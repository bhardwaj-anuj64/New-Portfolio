import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// Override if localhost:5000 is unavailable on your machine (e.g. `BACKEND_URL=http://localhost:5080 npm run dev`).
const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // host:true binds 0.0.0.0 so other devices on the LAN (e.g. a phone for mobile testing)
    // can reach the dev server; the proxy lets those devices hit the local backend too, since
    // api.ts uses relative paths in dev now instead of a hardcoded localhost:5000.
    host: true,
    proxy: {
      '/api': backendUrl,
      '/hubs': { target: backendUrl, ws: true },
    },
  },
})
