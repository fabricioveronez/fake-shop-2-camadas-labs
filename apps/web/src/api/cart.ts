import { syncCartId } from '../lib/cartId'
import { http } from '../lib/http'
import type { Cart } from './types'

/**
 * Toda resposta de carrinho passa por `syncCartId`.
 *
 * A API cria o carrinho na primeira escrita e devolve o id — é aqui que ele é
 * guardado. E quando o carrinho deixa de existir (pedido fechado, banco
 * recriado), ela devolve `id: null` e o id local é descartado no mesmo passo.
 */
async function withSync(promise: Promise<Cart>): Promise<Cart> {
  const cart = await promise
  syncCartId(cart.id)
  return cart
}

export const cartApi = {
  get: () => withSync(http.get<Cart>('/cart')),

  addItem: (productId: number, quantity: number) =>
    withSync(http.post<Cart>('/cart/items', { product_id: productId, quantity })),

  /** Quantidade zero remove o item. */
  updateItem: (itemId: number, quantity: number) =>
    withSync(http.patch<Cart>(`/cart/items/${itemId}`, { quantity })),

  removeItem: (itemId: number) => withSync(http.delete<Cart>(`/cart/items/${itemId}`)),

  clear: () => withSync(http.delete<Cart>('/cart')),
}

export const EMPTY_CART: Cart = {
  id: null,
  items: [],
  item_count: 0,
  subtotal: '0.00',
  shipping: '0.00',
  total: '0.00',
}
