import { execSync } from 'node:child_process'
import { test as base } from '@playwright/test'

export { expect } from '@playwright/test'

/**
 * Comando que zera os pedidos entre um teste e outro. Opcional: sem ele a
 * suíte roda igual, só fica sujeita a estado residual.
 *
 * É especialmente necessário contra o monolito, cujo checkout fecha
 * `Order.query.filter_by(is_open=True).first()` — o pedido aberto mais antigo
 * do banco, não o do visitante. Sem limpar, um carrinho abandonado por um
 * teste anterior é o que o teste seguinte finaliza.
 *
 * Exemplo (baseline):
 *   E2E_RESET_CMD='docker compose -f docker-compose.baseline.yml exec -T db \
 *     psql -U ecommerce -d ecommerce -q -c "truncate order_items, orders restart identity cascade"'
 */
const RESET_CMD = process.env.E2E_RESET_CMD

function resetOrders(): void {
  if (!RESET_CMD) return
  try {
    execSync(RESET_CMD, { stdio: 'ignore' })
  } catch (error) {
    throw new Error(
      `E2E_RESET_CMD falhou. Verifique se a stack está no ar.\nComando: ${RESET_CMD}\n${String(error)}`,
    )
  }
}

/**
 * `test` com estado de pedidos limpo antes de cada caso. Os specs importam
 * daqui, não de `@playwright/test`.
 */
export const test = base.extend<{ cleanOrders: void }>({
  cleanOrders: [
    async ({}, use) => {
      resetOrders()
      await use()
    },
    { auto: true },
  ],
})
