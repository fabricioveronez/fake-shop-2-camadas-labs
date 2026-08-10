import type { Locator } from '@playwright/test'
import { BasePage } from './BasePage.js'
import { parseMoney } from '../fixtures/money.js'

/** Página de detalhe de um produto. */
export class ProductPage extends BasePage {
  async goto(productId: number): Promise<void> {
    await this.page.goto(`/detail/${productId}`)
    await this.settle()
  }

  async name(): Promise<string> {
    const el = this.page.locator('[data-testid="product-name"], h3').first()
    return (await el.innerText()).trim()
  }

  async price(): Promise<number> {
    const el = this.page.locator('[data-testid="product-price"], h3.font-weight-semi-bold').first()
    return parseMoney(await el.innerText())
  }

  async description(): Promise<string> {
    const byTestId = this.page.locator('[data-testid="product-description"]')
    if (await byTestId.count()) return (await byTestId.first().innerText()).trim()
    // Jinja: a descrição longa fica no painel "Descrição do Produto"
    return (await this.page.locator('.tab-pane p').first().innerText()).trim()
  }

  private relatedSection(): Locator {
    return this.page.locator('[data-testid="related-products"], .related-carousel')
  }

  async relatedNames(): Promise<string[]> {
    const names = await this.relatedSection()
      .locator('[data-testid="product-name"], a.h6')
      .allInnerTexts()
    return names.map((n) => n.trim())
  }

  private quantityInput(): Locator {
    return this.page.locator('[data-testid="quantity-input"], input[name="quantity"]').first()
  }

  /**
   * Adiciona o produto ao carrinho.
   *
   * O stepper +/− não é usado: no monolito ele não tem handler (o `main.js`
   * aborta antes de registrá-lo, porque `owlCarousel` não existe), então
   * clicar nos botões não muda a quantidade. Preencher o campo diretamente é
   * o caminho que funciona nas duas implementações.
   */
  async addToCart(quantity = 1): Promise<void> {
    await this.quantityInput().fill(String(quantity))
    await this.mutateOrder(() =>
      this.page.getByRole('button', { name: /adicionar.*carrinho/i }).click(),
    )
  }

  /** O stepper "+" existe e incrementa o campo? (quebrado no monolito) */
  async incrementViaStepper(): Promise<number> {
    const before = Number(await this.quantityInput().inputValue())
    await this.page.locator('[data-testid="quantity-plus"], .btn-plus').first().click()
    await this.page.waitForTimeout(300)
    return Number(await this.quantityInput().inputValue()) - before
  }
}
