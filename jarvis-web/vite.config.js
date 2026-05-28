import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// `npm run dev`        → HTTP  (sem aviso de certificado)
// `npm run dev:https`  → HTTPS (só se precisar de mic em outro dispositivo na rede)
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'https' ? [basicSsl()] : [])],
  server: {
    host: true,
    port: 5173,
  },
}))
