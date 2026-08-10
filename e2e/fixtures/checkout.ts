/** Dados usados para preencher o formulário de checkout. */
export interface CheckoutData {
  first_name: string
  last_name: string
  email: string
  mobile: string
  address1: string
  address2?: string
  city: string
  state: string
  zip: string
  card_name: string
  card_number: string
  expiry_date: string
  cvv: string
}

export const VALID_CHECKOUT: CheckoutData = {
  first_name: 'Ana',
  last_name: 'Silva',
  email: 'ana.silva@example.com',
  mobile: '11999998888',
  address1: 'Rua das Laranjeiras, 100',
  address2: 'Apto 42',
  city: 'São Paulo',
  state: 'SP',
  zip: '01001-000',
  card_name: 'ANA SILVA',
  // PAN de teste válido no Luhn, aprovado pelo gateway simulado.
  card_number: '4242424242424242',
  expiry_date: '12/34',
  cvv: '123',
}

/** Um segundo comprador, para os cenários de isolamento entre visitantes. */
export const OTHER_CHECKOUT: CheckoutData = {
  ...VALID_CHECKOUT,
  first_name: 'Bruno',
  last_name: 'Costa',
  email: 'bruno.costa@example.com',
  card_name: 'BRUNO COSTA',
}
