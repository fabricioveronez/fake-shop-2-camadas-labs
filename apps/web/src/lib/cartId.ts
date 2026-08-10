/**
 * Persistência do identificador do carrinho.
 *
 * Não há login: o carrinho de um visitante é identificado pelo UUID que a API
 * devolve, guardado aqui e reenviado no header `X-Cart-Id`.
 *
 * Sem cookie, de propósito — ver ADR 0003. O contrapeso é que localStorage não
 * sobrevive a limpeza de dados nem sincroniza entre dispositivos, o que é
 * aceitável para carrinho de convidado.
 */

const STORAGE_KEY = 'fakeshop.cart_id'

/**
 * Alguns navegadores lançam ao tocar em localStorage (modo privado do Safari,
 * cookies de terceiros bloqueados em iframe). Nesses casos o carrinho vive só
 * na memória da aba: degrada, não quebra.
 */
let memoryFallback: string | null = null

function safeRead(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return memoryFallback
  }
}

function safeWrite(value: string): void {
  memoryFallback = value
  try {
    window.localStorage.setItem(STORAGE_KEY, value)
  } catch {
    /* segue com o fallback em memória */
  }
}

function safeRemove(): void {
  memoryFallback = null
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* idem */
  }
}

export function getCartId(): string | null {
  return safeRead()
}

export function setCartId(cartId: string): void {
  safeWrite(cartId)
}

export function clearCartId(): void {
  safeRemove()
}

/**
 * Alinha o id guardado ao que a API acabou de responder.
 *
 * A API devolve `id: null` quando o carrinho não existe mais — pedido
 * finalizado, banco recriado, id inválido. Nesses casos o id local vira lixo e
 * precisa sair, senão toda requisição seguinte carrega um header morto.
 */
export function syncCartId(cartId: string | null): void {
  if (cartId) {
    if (cartId !== safeRead()) setCartId(cartId)
  } else {
    clearCartId()
  }
}
