import { clearCartId } from '../lib/cartId'
import { http } from '../lib/http'
import type { CheckoutRequest, Order } from './types'

export const ordersApi = {
  /**
   * Fecha o carrinho. Os dados de cartão vão no corpo, são validados e
   * autorizados pela API, e não são persistidos: o pedido guarda apenas
   * bandeira e últimos quatro dígitos.
   */
  checkout: async (payload: CheckoutRequest): Promise<Order> => {
    const order = await http.post<Order>('/checkout', payload)
    // O carrinho deixou de existir junto com o fechamento.
    clearCartId()
    return order
  },

  get: (orderUuid: string) => http.get<Order>(`/orders/${orderUuid}`),
}
