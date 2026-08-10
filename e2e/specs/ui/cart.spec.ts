import { expect, test } from '../../fixtures/test.js'
import { CartPage } from '../../pages/CartPage.js'
import { ProductPage } from '../../pages/ProductPage.js'
import { productById } from '../../fixtures/products.js'
import { SHIPPING_FEE } from '../../fixtures/target.js'

test.describe('Carrinho', () => {
  test('começa vazio para um visitante novo', async ({ page }) => {
    const cart = new CartPage(page)
    await cart.goto()
    expect(await cart.isEmpty()).toBe(true)
  })

  test('adicionar um produto o coloca no carrinho com a quantidade pedida', async ({ page }) => {
    const product = productById(1)

    const detail = new ProductPage(page)
    await detail.goto(product.id)
    await detail.addToCart(2)

    const cart = new CartPage(page)
    await cart.goto()

    const lines = await cart.lines()
    expect(lines).toHaveLength(1)
    expect(lines[0].name).toContain(product.name)
    expect(lines[0].quantity).toBe(2)
    expect(lines[0].unitPrice).toBeCloseTo(product.price, 2)
    expect(lines[0].lineTotal).toBeCloseTo(product.price * 2, 2)
  })

  test('subtotal, frete e total são consistentes com os itens', async ({ page }) => {
    const first = productById(1)
    const second = productById(5)

    const detail = new ProductPage(page)
    await detail.goto(first.id)
    await detail.addToCart(2)
    await detail.goto(second.id)
    await detail.addToCart(3)

    const cart = new CartPage(page)
    await cart.goto()

    const expectedSubtotal = first.price * 2 + second.price * 3
    expect(await cart.subtotal()).toBeCloseTo(expectedSubtotal, 2)
    expect(await cart.shipping()).toBeCloseTo(SHIPPING_FEE, 2)
    expect(await cart.total()).toBeCloseTo(expectedSubtotal + SHIPPING_FEE, 2)
  })

  test('adicionar o mesmo produto duas vezes soma as quantidades', async ({ page }) => {
    const product = productById(2)

    const detail = new ProductPage(page)
    await detail.goto(product.id)
    await detail.addToCart(1)
    await detail.addToCart(3)

    const cart = new CartPage(page)
    await cart.goto()

    const lines = await cart.lines()
    expect(lines).toHaveLength(1)
    expect(lines[0].quantity).toBe(4)
  })

  test('alterar a quantidade recalcula os totais', async ({ page }) => {
    const product = productById(3)

    const detail = new ProductPage(page)
    await detail.goto(product.id)
    await detail.addToCart(1)

    const cart = new CartPage(page)
    await cart.goto()
    await cart.setQuantity(0, 4)

    const lines = await cart.lines()
    expect(lines[0].quantity).toBe(4)
    expect(await cart.subtotal()).toBeCloseTo(product.price * 4, 2)
    expect(await cart.total()).toBeCloseTo(product.price * 4 + SHIPPING_FEE, 2)
  })

  test('quantidade zero remove o item', async ({ page }) => {
    const detail = new ProductPage(page)
    await detail.goto(4)
    await detail.addToCart(2)

    const cart = new CartPage(page)
    await cart.goto()
    await cart.setQuantity(0, 0)

    expect(await cart.isEmpty()).toBe(true)
  })

  test('remover o item esvazia o carrinho', async ({ page }) => {
    const detail = new ProductPage(page)
    await detail.goto(5)
    await detail.addToCart(1)

    const cart = new CartPage(page)
    await cart.goto()
    await cart.removeItem(0)

    expect(await cart.isEmpty()).toBe(true)
  })
})
