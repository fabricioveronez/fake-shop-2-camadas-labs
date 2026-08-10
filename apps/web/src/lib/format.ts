const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

/**
 * Formata um valor monetário vindo da API.
 *
 * A API manda string decimal ("1299.00"). O monolito imprimia o float cru do
 * Python — "R$ 1299.0" —, que além de feio esconde os centavos.
 */
export function formatMoney(value: string | number): string {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(numeric)) return String(value)
  return BRL.format(numeric)
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(iso))
}
