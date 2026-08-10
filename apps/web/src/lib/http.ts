import { getCartId } from './cartId'

/**
 * Cliente HTTP.
 *
 * Ponto único que injeta o header `X-Cart-Id`. Nada de `credentials:
 * 'include'` — não há cookie no contrato, e é isso que faz a superfície de
 * CSRF desaparecer.
 *
 * A base é `/api` relativo por padrão: o destino real é resolvido pelo proxy
 * (Vite em dev, nginx em produção), então a mesma build serve todo ambiente.
 */
const BASE = import.meta.env.VITE_API_URL || '/api'

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }

  static async fromResponse(response: Response): Promise<ApiError> {
    let message = `Erro ${response.status}`
    let code = 'HTTP_ERROR'
    try {
      const body = await response.json()
      code = body.code ?? code
      message = typeof body.detail === 'string' ? body.detail : message
    } catch {
      /* resposta sem corpo JSON — mantém a mensagem genérica */
    }
    return new ApiError(response.status, message, code)
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body) headers.set('Content-Type', 'application/json')

  const cartId = getCartId()
  if (cartId) headers.set('X-Cart-Id', cartId)

  const response = await fetch(`${BASE}${path}`, { ...init, headers })

  if (!response.ok) throw await ApiError.fromResponse(response)
  if (response.status === 204) return undefined as T

  return (await response.json()) as T
}

export const http = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
