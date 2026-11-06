import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// L'interface est servie par server/index.js (npm run dev) qui intègre Vite.
export default defineConfig({
  plugins: [react()],
})
