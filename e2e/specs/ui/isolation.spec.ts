import { expect, test } from '../../fixtures/test.js'
import { CartPage } from '../../pages/CartPage.js'
import { CheckoutPage } from '../../pages/CheckoutPage.js'
import { ConfirmationPage } from '../../pages/ConfirmationPage.js'
import { ProductPage } from '../../pages/ProductPage.js'
import { productById } from '../../fixtures/products.js'
import { OTHER_CHECKOUT, VALID_CHECKOUT } from '../../fixtures/checkout.js'
import { IS_LEGACY } from '../../fixtures/target.js'

test.describe('Isolamento entre visitantes', () => {
  /**
   * Este é o spec mais importante da suíte.
   *
   * No monolito, index.py:90 fecha o pedido com
   * `Order.query.filter_by(is_open=True).first()` — o primeiro pedido aberto
   * do banco, seja de quem for. Com dois visitantes simultâneos, um finaliza o
   * carrinho do outro, e cada um recebe os itens errados.
   */
  test('cada visitante finaliza o próprio carrinho', async ({ browser }) => {
    test.fail(IS_LEGACY, 'monolito: checkout ignora o cookie (index.py:90)')

    const aliceProduct = productById(1)
    const bobProduct = productById(4)

    const alice = await browser.newContext()
    const bob = await browser.newContext()

    try {
      const alicePage = await alice.newPage()
      const bobPage = await bob.newPage()

      // Os dois montam carrinhos diferentes, sem finalizar.
      const aliceDetail = new ProductPage(alicePage)
      await aliceDetail.goto(aliceProduct.id)
      await aliceDetail.addToCart(1)

      const bobDetail = new ProductPage(bobPage)
      await bobDetail.goto(bobProduct.id)
      await bobDetail.addToCart(2)

      // Bob fecha primeiro — deve levar o produto dele, não o da Alice.
      const bobCheckout = new CheckoutPage(bobPage)
      await bobCheckout.goto()
      await bobCheckout.fillAndSubmit(OTHER_CHECKOUT)

      const bobConfirmation = new ConfirmationPage(bobPage)
      expect(await bobConfirmation.isOpen()).toBe(true)
      const bobItems = (await bobConfirmation.itemLines()).join('\n')
      expect(bobItems).toContain(bobProduct.name)
      expect(bobItems).not.toContain(aliceProduct.name)

      // O carrinho da Alice segue intacto depois do checkout do Bob.
      const aliceCart = new CartPage(alicePage)
      await aliceCart.goto()
      const aliceLines = await aliceCart.lines()
      expect(aliceLines).toHaveLength(1)
      expect(aliceLines[0].name).toContain(aliceProduct.name)

      // E ela consegue fechar o dela normalmente.
      const aliceCheckout = new CheckoutPage(alicePage)
      await aliceCheckout.goto()
      await aliceCheckout.fillAndSubmit(VALID_CHECKOUT)

      const aliceConfirmation = new ConfirmationPage(alicePage)
      expect(await aliceConfirmation.isOpen()).toBe(true)
      const aliceItems = (await aliceConfirmation.itemLines()).join('\n')
      expect(aliceItems).toContain(aliceProduct.name)
      expect(aliceItems).not.toContain(bobProduct.name)
    } finally {
      await alice.close()
      await bob.close()
    }
  })

  test('cada pedido recebe um número distinto', async ({ browser }) => {
    const alice = await browser.newContext()
    const bob = await browser.newContext()

    try {
      const alicePage = await alice.newPage()
      const bobPage = await bob.newPage()

      for (const [page, productId] of [
        [alicePage, 2],
        [bobPage, 3],
      ] as const) {
        const detail = new ProductPage(page)
        await detail.goto(productId)
        await detail.addToCart(1)

        const checkout = new CheckoutPage(page)
        await checkout.goto()
        await checkout.fillAndSubmit(VALID_CHECKOUT)
      }

      const aliceNumber = await new ConfirmationPage(alicePage).orderNumber()
      const bobNumber = await new ConfirmationPage(bobPage).orderNumber()

      expect(aliceNumber).not.toBe(bobNumber)
    } finally {
      await alice.close()
      await bob.close()
    }
  })
})
