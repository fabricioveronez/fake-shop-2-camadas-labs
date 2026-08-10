/**
 * Lê um valor monetário de um texto de tela, tolerando os dois formatos que a
 * loja já produziu:
 *
 *   - monolito Jinja: `R$ 1299.0`, `$1299.0`  (float cru do Python)
 *   - SPA React:      `R$ 1.299,00`           (Intl.NumberFormat pt-BR)
 *
 * Os specs comparam números, nunca strings — é o que permite a mesma asserção
 * valer nas duas implementações.
 */
export function parseMoney(text: string): number {
  const raw = text.replace(/[R$\s ]/g, '').trim()
  if (raw === '') throw new Error(`Valor monetário vazio em: ${JSON.stringify(text)}`)

  const hasDot = raw.includes('.')
  const hasComma = raw.includes(',')

  let normalized: string
  if (hasDot && hasComma) {
    // pt-BR: ponto é separador de milhar, vírgula é decimal
    normalized = raw.replace(/\./g, '').replace(',', '.')
  } else if (hasComma) {
    normalized = raw.replace(',', '.')
  } else {
    normalized = raw
  }

  const value = Number(normalized)
  if (Number.isNaN(value)) {
    throw new Error(`Não consegui ler um valor monetário de: ${JSON.stringify(text)}`)
  }
  return value
}

/** Compara valores monetários ignorando ruído de ponto flutuante. */
export function moneyEquals(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.005
}
