import { expect, test } from '../../fixtures/test.js'
import { ProductPage } from '../../pages/ProductPage.js'
import { productById } from '../../fixtures/products.js'
import { IS_LEGACY } from '../../fixtures/target.js'

test.describe('Detalhe do produto', () => {
  test('mostra nome, preço e descrição longa', async ({ page }) => {
    const expected = productById(1)
    const detail = new ProductPage(page)
    await detail.goto(expected.id)

    expect(await detail.name()).toContain(expected.name)
    expect(await detail.price()).toBeCloseTo(expected.price, 2)
    expect((await detail.description()).length).toBeGreaterThan(100)
  })

  test('mostra 4 produtos relacionados', async ({ page }) => {
    const detail = new ProductPage(page)
    await detail.goto(1)
    expect(await detail.relatedNames()).toHaveLength(4)
  })

  test('os relacionados não incluem o próprio produto', async ({ page }) => {
    // Quebrado no monolito: index.py:191 faz Product.query.limit(4) sem filtrar
    // o produto atual, então o primeiro "relacionado" é ele mesmo.
    test.fail(IS_LEGACY, 'monolito: related_products sem filtro em index.py:191')

    const current = productById(1)
    const detail = new ProductPage(page)
    await detail.goto(current.id)

    expect(await detail.relatedNames()).not.toContain(current.name)
  })

  test('o stepper de quantidade incrementa o campo', async ({ page }) => {
    // Quebrado no monolito: /lib/owlcarousel/* nunca existiu no repositório, e
    // main.js:37 chama $('.related-carousel').owlCarousel(...) sem guard. O
    // TypeError aborta a IIFE antes de registrar os handlers de .btn-plus.
    test.fail(IS_LEGACY, 'monolito: main.js aborta antes de ligar o stepper')

    const detail = new ProductPage(page)
    await detail.goto(1)
    expect(await detail.incrementViaStepper()).toBe(1)
  })
})
