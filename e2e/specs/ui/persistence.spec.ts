import { expect, test } from '../../fixtures/test.js'
import { CartPage } from '../../pages/CartPage.js'
import { ProductPage } from '../../pages/ProductPage.js'
import { productById } from '../../fixtures/products.js'

test.describe('Persistência do carrinho', () => {
  /**
   * O spec afirma apenas que o carrinho sobrevive. O mecanismo é detalhe de
   * implementação — cookie `order_id` no monolito, `localStorage` no SPA — e
   * por isso não aparece aqui.
   */
  test('o carrinho sobrevive a um reload', async ({ page }) => {
    const product = productById(6)

    const detail = new ProductPage(page)
    await detail.goto(product.id)
    await detail.addToCart(2)

    const cart = new CartPage(page)
    await cart.goto()
    expect(await cart.itemCount()).toBe(1)

    await page.reload()
    await page.waitForLoadState('networkidle')

    const lines = await cart.lines()
    expect(lines).toHaveLength(1)
    expect(lines[0].quantity).toBe(2)
  })

  test('o carrinho sobrevive a navegar para outra página e voltar', async ({ page }) => {
    const detail = new ProductPage(page)
    await detail.goto(7)
    await detail.addToCart(1)

    await page.goto('/shop')
    await page.waitForLoadState('networkidle')

    const cart = new CartPage(page)
    await cart.goto()
    expect(await cart.itemCount()).toBe(1)
  })

  test('visitantes diferentes têm carrinhos independentes', async ({ browser }) => {
    const alice = await browser.newContext()
    const bob = await browser.newContext()

    try {
      const alicePage = await alice.newPage()
      const bobPage = await bob.newPage()

      await new ProductPage(alicePage).goto(1)
      await new ProductPage(alicePage).addToCart(1)

      const bobCart = new CartPage(bobPage)
      await bobCart.goto()
      expect(await bobCart.isEmpty()).toBe(true)

      const aliceCart = new CartPage(alicePage)
      await aliceCart.goto()
      expect(await aliceCart.itemCount()).toBe(1)
    } finally {
      await alice.close()
      await bob.close()
    }
  })
})
