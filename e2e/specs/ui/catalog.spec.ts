import { expect, test } from '../../fixtures/test.js'
import { CatalogPage } from '../../pages/CatalogPage.js'
import { PRODUCT_COUNT, SEED_PRODUCTS } from '../../fixtures/products.js'

test.describe('Catálogo', () => {
  test('a home lista os produtos do seed com nome e preço', async ({ page }) => {
    const catalog = new CatalogPage(page)
    await catalog.gotoHome()

    expect(await catalog.count()).toBe(PRODUCT_COUNT)

    const names = await catalog.productNames()
    for (const product of SEED_PRODUCTS) {
      expect(names).toContain(product.name)
    }

    const prices = await catalog.productPrices()
    expect(prices).toEqual(expect.arrayContaining(SEED_PRODUCTS.map((p) => p.price)))
  })

  test('a listagem /shop mostra os mesmos produtos da home', async ({ page }) => {
    const catalog = new CatalogPage(page)

    await catalog.gotoHome()
    const homeNames = (await catalog.productNames()).sort()

    await catalog.gotoShop()
    const shopNames = (await catalog.productNames()).sort()

    expect(shopNames).toEqual(homeNames)
  })

  test('as imagens dos produtos carregam na home', async ({ page }) => {
    const catalog = new CatalogPage(page)
    await catalog.gotoHome()
    expect(await catalog.brokenImageSources()).toEqual([])
  })

  test('as imagens dos produtos carregam em /shop', async ({ page }) => {
    // Nota: shop.html:26 usa `src="img/…"` relativo (a home usa `/img/…`).
    // Funciona por acaso — `/shop` não tem barra final, então o browser resolve
    // para `/img/…`. Bastaria a rota virar `/shop/` para quebrar. O SPA não
    // reproduz isso: a URL da imagem vem pronta da API, em `image_url`.
    const catalog = new CatalogPage(page)
    await catalog.gotoShop()
    expect(await catalog.brokenImageSources()).toEqual([])
  })

  test('clicar num produto abre o detalhe correspondente', async ({ page }) => {
    const catalog = new CatalogPage(page)
    await catalog.gotoShop()

    const target = SEED_PRODUCTS[0]
    await catalog.openProduct(target.name)

    expect(page.url()).toContain(`/detail/${target.id}`)
    await expect(page.getByText(target.name).first()).toBeVisible()
  })
})
