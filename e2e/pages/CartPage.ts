import type { Locator } from '@playwright/test'
import { BasePage } from './BasePage.js'
import { parseMoney } from '../fixtures/money.js'
import { IS_LEGACY } from '../fixtures/target.js'

export interface CartLine {
  name: string
  unitPrice: number
  quantity: number
  lineTotal: number
}

export class CartPage extends BasePage {
  async goto(): Promise<void> {
    await this.page.goto('/cart')
    await this.settle()
  }

  private rows(): Locator {
    return this.page.locator('[data-testid="cart-row"], table tbody tr')
  }

  async isEmpty(): Promise<boolean> {
    return this.page.getByText(/carrinho está vazio/i).isVisible()
  }

  async lines(): Promise<CartLine[]> {
    if (await this.isEmpty()) return []

    const rows = this.rows()
    const total = await rows.count()
    const lines: CartLine[] = []

    for (let i = 0; i < total; i++) {
      const row = rows.nth(i)
      const cells = row.locator('td')
      lines.push({
        name: (await cells.nth(0).innerText()).trim(),
        unitPrice: parseMoney(await cells.nth(1).innerText()),
        quantity: Number(
          await row.locator('[data-testid="quantity-input"], input[name="quantity"]').inputValue(),
        ),
        lineTotal: parseMoney(await cells.nth(3).innerText()),
      })
    }
    return lines
  }

  async itemCount(): Promise<number> {
    return (await this.lines()).length
  }

  subtotal(): Promise<number> {
    return this.readSummary('subtotal')
  }

  shipping(): Promise<number> {
    return this.readSummary('shipping')
  }

  total(): Promise<number> {
    return this.readSummary('total')
  }

  /**
   * Define a quantidade de uma linha.
   *
   * Este é o único ponto da suíte que precisa saber qual implementação está no
   * ar. No Jinja a alteração só vale ao submeter o form (o stepper +/− não tem
   * handler); no React o próprio campo dispara a mutação ao perder o foco.
   */
  async setQuantity(index: number, quantity: number): Promise<void> {
    const input = this.rows()
      .nth(index)
      .locator('[data-testid="quantity-input"], input[name="quantity"]')

    await this.mutateOrder(async () => {
      await input.fill(String(quantity))
      if (IS_LEGACY) await input.press('Enter')
    })
  }

  async removeItem(index: number): Promise<void> {
    await this.mutateOrder(() =>
      this.rows().nth(index).locator('[data-testid="remove-item"], .btn-danger').click(),
    )
  }

  async goToCheckout(): Promise<void> {
    await this.page.getByRole('link', { name: /fechar pedido|finalizar/i }).click()
    await this.settle()
  }
}
