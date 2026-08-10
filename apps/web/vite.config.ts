import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * O SPA sempre chama `/api` relativo — nunca uma URL absoluta.
 *
 * O Vite inlina `import.meta.env.*` em tempo de build, então embutir a URL da
 * API amarraria o bundle a um ambiente. Quem resolve o destino é o proxy
 * abaixo, o que também deixa tudo na mesma origem: nada de CORS, nada de
 * preflight no caminho normal.
 */
// Fora do compose a API está em localhost; dentro dele, no serviço `api`.
const PROXY_TARGET = process.env.VITE_PROXY_TARGET ?? 'http://localhost:8000'

// Bind mount de Docker no macOS e no Windows não propaga eventos de inotify,
// então sem polling o HMR simplesmente não dispara.
const USE_POLLING = process.env.VITE_USE_POLLING === 'true'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': { target: PROXY_TARGET, changeOrigin: true },
      '/static': { target: PROXY_TARGET, changeOrigin: true },
    },
    watch: USE_POLLING ? { usePolling: true, interval: 300 } : undefined,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
