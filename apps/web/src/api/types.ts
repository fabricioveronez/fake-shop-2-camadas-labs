/**
 * Contrato da API.
 *
 * Escrito à mão, espelhando os schemas Pydantic. `npm run gen:types` gera a
 * versão derivada do `openapi.json` em `src/types/api.ts`, e o CI compara as
 * duas — é o que pega renomeação de campo no backend antes de virar bug de
 * runtime no front.
 *
 * Valores monetários chegam como string decimal ("1299.00"), nunca number:
 * float em JSON acumula erro de arredondamento em soma de dinheiro.
 */

export interface ProductSummary {
  id: number
  name: string
  image: string | null
  image_url: string | null
}

export interface Product extends ProductSummary {
  price: string
  short_description: string | null
  description: string | null
}

export interface ProductList {
  items: Product[]
  total: number
}

export interface CartItem {
  id: number
  product: ProductSummary
  quantity: number
  unit_price: string
  line_total: string
}

export interface Cart {
  /** `null` enquanto o visitante não tem carrinho. Não é erro. */
  id: string | null
  items: CartItem[]
  item_count: number
  subtotal: string
  shipping: string
  total: string
}

export interface OrderItem {
  product_id: number
  product_name: string
  quantity: number
  unit_price: string
  line_total: string
}

export interface Order {
  order_uuid: string
  order_number: string | null
  status: string
  created_at: string
  paid_at: string | null
  customer_name: string | null
  customer_email: string | null
  address1: string | null
  address2: string | null
  city: string | null
  state: string | null
  country: string | null
  zip_code: string | null
  mobile: string | null
  items: OrderItem[]
  subtotal: string
  shipping: string
  total: string
  payment: { brand: string | null; last4: string | null }
}

export interface CheckoutRequest {
  customer: {
    first_name: string
    last_name: string
    email: string
    mobile: string
  }
  shipping_address: {
    address1: string
    address2?: string | null
    city: string
    state: string
    country: string
    zip_code: string
  }
  payment: {
    card_name: string
    card_number: string
    expiry_date: string
    cvv: string
  }
}
