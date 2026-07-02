import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite"
import pkg  from "./package.json" with { type: "json"}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    port: 5173,
    proxy: {
      "/auth": "http://localhost:3005",
      "/user": "http://localhost:3005",
      "/cameras": "http://localhost:3005",
      "/alerts": "http://localhost:3005",
      "/health": "http://localhost:3005",
      "/ws": {
        target: "ws://localhost:3005",
        ws: true,
      },
    },
  },

  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  }
})
