import { expect, test } from '../../fixtures/test.js'
import { CartPage } from '../../pages/CartPage.js'
import { CheckoutPage } from '../../pages/CheckoutPage.js'
import { ConfirmationPage } from '../../pages/ConfirmationPage.js'
import { ProductPage } from '../../pages/ProductPage.js'
import { productById } from '../../fixtures/products.js'
import { VALID_CHECKOUT } from '../../fixtures/checkout.js'
import { IS_LEGACY, SHIPPING_FEE } from '../../fixtures/target.js'

test.describe('Checkout', () => {
  test('o total do checkout bate com o do carrinho', async ({ page }) => {
    const product = productById(1)

    const detail = new ProductPage(page)
    await detail.goto(product.id)
    await detail.addToCart(2)

    const cart = new CartPage(page)
    await cart.goto()
    const cartTotal = await cart.total()

    const checkout = new CheckoutPage(page)
    await checkout.goto()

    expect(await checkout.total()).toBeCloseTo(cartTotal, 2)
    expect(cartTotal).toBeCloseTo(product.price * 2 + SHIPPING_FEE, 2)
  })

  test('finalizar a compra leva à confirmação com número de pedido', async ({ page }) => {
    const product = productById(2)

    const detail = new ProductPage(page)
    await detail.goto(product.id)
    await detail.addToCart(1)

    const checkout = new CheckoutPage(page)
    await checkout.goto()
    await checkout.fillAndSubmit(VALID_CHECKOUT)

    const confirmation = new ConfirmationPage(page)
    expect(await confirmation.isOpen()).toBe(true)
    expect(await confirmation.orderNumber()).toMatch(/^\d{6}$/)

    const lines = await confirmation.itemLines()
    expect(lines.join('\n')).toContain(product.name)
  })

  test('o carrinho fica vazio depois do pedido fechado', async ({ page }) => {
    const detail = new ProductPage(page)
    await detail.goto(5)
    await detail.addToCart(1)

    const checkout = new CheckoutPage(page)
    await checkout.goto()
    await checkout.fillAndSubmit(VALID_CHECKOUT)

    const cart = new CartPage(page)
    await cart.goto()
    expect(await cart.isEmpty()).toBe(true)
  })

  test('a confirmação não expõe dados do cartão', async ({ page }) => {
    const detail = new ProductPage(page)
    await detail.goto(9)
    await detail.addToCart(1)

    const checkout = new CheckoutPage(page)
    await checkout.goto()
    await checkout.fillAndSubmit(VALID_CHECKOUT)

    const body = await new ConfirmationPage(page).bodyText()
    expect(body).not.toContain(VALID_CHECKOUT.card_number)
    expect(body).not.toContain(VALID_CHECKOUT.cvv)
  })

  test('ir ao checkout com o carrinho vazio não abre o formulário', async ({ page }) => {
    const checkout = new CheckoutPage(page)
    await checkout.goto()
    expect(await checkout.isOpen()).toBe(false)
  })

  test('um pedido inexistente mostra "não encontrado", não um erro', async ({ page }) => {
    // Quebrado no monolito: index.py:126 passa order=None ao template, e o
    // Jinja estoura AttributeError em {{ order.order_number }} — 500 cru.
    test.fail(IS_LEGACY, 'monolito: order_confirmation com pedido inexistente dá 500')

    const confirmation = new ConfirmationPage(page)
    await confirmation.gotoUnknown()

    const body = await confirmation.bodyText()
    expect(body).toMatch(/não encontrad|not found|404/i)
    expect(body).not.toMatch(/pedido confirmado/i)
  })
})
