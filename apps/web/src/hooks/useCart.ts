import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { cartApi, EMPTY_CART } from '../api/cart'

export const CART_QUERY_KEY = ['cart'] as const

/**
 * O carrinho é estado do servidor, então quem cuida dele é o React Query.
 *
 * Toda mutação devolve o carrinho completo, então o resultado vai direto para
 * o cache com `setQueryData` — sem refetch depois de cada clique, e sem
 * chance de os totais divergirem dos itens exibidos.
 */
export function useCart() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: CART_QUERY_KEY,
    queryFn: cartApi.get,
    // O carrinho muda por ação do próprio usuário, não sozinho.
    staleTime: 30_000,
  })

  const addItem = useMutation({
    mutationFn: ({ productId, quantity }: { productId: number; quantity: number }) =>
      cartApi.addItem(productId, quantity),
    onSuccess: (cart) => queryClient.setQueryData(CART_QUERY_KEY, cart),
  })

  const updateItem = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: number; quantity: number }) =>
      cartApi.updateItem(itemId, quantity),
    onSuccess: (cart) => queryClient.setQueryData(CART_QUERY_KEY, cart),
  })

  const removeItem = useMutation({
    mutationFn: (itemId: number) => cartApi.removeItem(itemId),
    onSuccess: (cart) => queryClient.setQueryData(CART_QUERY_KEY, cart),
  })

  return {
    cart: query.data ?? EMPTY_CART,
    isLoading: query.isLoading,
    error: query.error,
    addItem,
    updateItem,
    removeItem,
  }
}
