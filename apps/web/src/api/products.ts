import { http } from '../lib/http'
import type { Product, ProductList } from './types'

export const productsApi = {
  list: () => http.get<ProductList>('/products'),
  get: (id: number) => http.get<Product>(`/products/${id}`),
  related: (id: number, limit = 4) => http.get<Product[]>(`/products/${id}/related?limit=${limit}`),
}
