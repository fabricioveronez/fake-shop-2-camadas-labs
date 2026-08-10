/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Escape hatch para desenvolvimento apontando para uma API remota. Em uso
   * normal fica vazio, e o SPA chama `/api` relativo — resolvido pelo proxy
   * do Vite em dev e pelo nginx em produção.
   */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
