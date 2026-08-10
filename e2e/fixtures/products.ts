/**
 * Os 9 produtos com que a loja é semeada. São os mesmos do monolito original,
 * o que permite a suíte afirmar valores concretos (subtotal, total) em vez de
 * só verificar consistência interna.
 */
export interface SeedProduct {
  id: number
  name: string
  price: number
  image: string
}

export const SEED_PRODUCTS: SeedProduct[] = [
  { id: 1, name: 'Webcam Ultra HD 4K MX Brio', price: 1299.0, image: 'product-1.jpg' },
  { id: 2, name: 'Elgato Stream Deck', price: 1199.0, image: 'product-2.jpg' },
  { id: 3, name: 'Galaxy Book4', price: 4199.0, image: 'product-3.jpg' },
  { id: 4, name: 'Notebook Dell XPS 13', price: 8999.0, image: 'product-4.jpg' },
  { id: 5, name: 'JBL Tune 720BT', price: 349.0, image: 'product-5.jpg' },
  { id: 6, name: 'Smartphone Samsung Galaxy S22', price: 4499.0, image: 'product-6.jpg' },
  { id: 7, name: 'Câmera EOS Rebel SL3', price: 3999.0, image: 'product-7.jpg' },
  { id: 8, name: 'Microfone Hollyland Lark M2 Duo', price: 1399.0, image: 'product-8.jpg' },
  { id: 9, name: 'Microfone Condensador Blue Yeti', price: 899.0, image: 'product-9.jpg' },
]

export const PRODUCT_COUNT = SEED_PRODUCTS.length

export function productById(id: number): SeedProduct {
  const found = SEED_PRODUCTS.find((p) => p.id === id)
  if (!found) throw new Error(`Produto ${id} não está no seed`)
  return found
}
