import type { Locator } from '@playwright/test'
import { BasePage } from './BasePage.js'
import { parseMoney } from '../fixtures/money.js'

/** Uma vitrine de produtos: serve tanto para a home quanto para `/shop`. */
export class CatalogPage extends BasePage {
  async gotoHome(): Promise<void> {
    await this.page.goto('/')
    await this.settle()
  }

  async gotoShop(): Promise<void> {
    await this.page.goto('/shop')
    await this.settle()
  }

  cards(): Locator {
    return this.productCards()
  }

  async count(): Promise<number> {
    return this.cards().count()
  }

  /** Nomes dos produtos exibidos, na ordem em que aparecem. */
  async productNames(): Promise<string[]> {
    const names = await this.cards()
      .locator('[data-testid="product-name"], a.h6')
      .allInnerTexts()
    return names.map((n) => n.trim())
  }

  /** Preços exibidos, já convertidos para número. */
  async productPrices(): Promise<number[]> {
    const prices = await this.cards()
      .locator('[data-testid="product-price"], h5')
      .allInnerTexts()
    return prices.map(parseMoney)
  }

  /**
   * Verifica que toda imagem de produto realmente carregou.
   *
   * `naturalWidth === 0` é a única forma confiável: um `<img>` com src quebrado
   * continua presente no DOM e visível para o Playwright.
   */
  async brokenImageSources(): Promise<string[]> {
    const images = this.cards().locator('img')
    const total = await images.count()
    const broken: string[] = []
    for (let i = 0; i < total; i++) {
      const img = images.nth(i)
      const ok = await img.evaluate(
        (el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0,
      )
      if (!ok) broken.push((await img.getAttribute('src')) ?? '(sem src)')
    }
    return broken
  }

  async openProduct(name: string): Promise<void> {
    await this.page.getByRole('link', { name, exact: false }).first().click()
    await this.settle()
  }
}
