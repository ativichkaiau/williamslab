import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// WilliamsLab — Vite + React + TS. Frontend-first MVP; no backend required in v1.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, open: false },
})
