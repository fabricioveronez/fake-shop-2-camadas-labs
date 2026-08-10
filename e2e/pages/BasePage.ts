import type { Locator, Page } from '@playwright/test'
import { parseMoney } from '../fixtures/money.js'
import { IS_LEGACY } from '../fixtures/target.js'

/**
 * Base dos page objects.
 *
 * Regra desta camada: **só aqui existe conhecimento de DOM.** Os specs falam em
 * comportamento ("adicione 2 unidades", "qual o subtotal"), e os page objects
 * traduzem isso para o markup de cada implementação.
 *
 * Os locators são escritos como união CSS `[data-testid="x"], .classe-antiga`,
 * o que faz o mesmo page object servir ao Jinja (classes Bootstrap) e ao React
 * (`data-testid`), sem ramificar por alvo.
 */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  /** Cartão de produto, tanto na home quanto na listagem e nos relacionados. */
  protected productCards(scope?: Locator): Locator {
    const root = scope ?? this.page.locator('body')
    return root.locator('[data-testid="product-card"], .product-item')
  }

  /**
   * Lê um valor do resumo do pedido (subtotal, frete, total).
   *
   * No React, cada valor carrega um `data-testid`. No Jinja, o resumo é um par
   * de elementos irmãos — `<h6>Subtotal</h6><h6>R$ 2598.0</h6>` — então o
   * fallback busca o rótulo e lê o irmão seguinte.
   */
  protected async readSummary(key: 'subtotal' | 'shipping' | 'total'): Promise<number> {
    const byTestId = this.page.locator(`[data-testid="summary-${key}"]`)
    if (await byTestId.count()) {
      return parseMoney(await byTestId.first().innerText())
    }

    const labels = { subtotal: 'Subtotal', shipping: 'Taxa de Entrega', total: 'Total' }
    const label = this.page.getByText(labels[key], { exact: true }).last()
    const value = label.locator('xpath=following-sibling::*[1]')
    return parseMoney(await value.innerText())
  }

  /** Espera a navegação assentar — cobre tanto full reload quanto rota de SPA. */
  protected async settle(): Promise<void> {
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Executa uma ação que altera o pedido e só retorna quando o efeito chegou.
   *
   * As duas implementações sinalizam conclusão de formas diferentes. No Jinja
   * o clique submete um form e a navegação é o sinal. No SPA não há
   * navegação: a chamada é assíncrona, e esperar por "rede ociosa" pode
   * terminar *antes* de a requisição sair — a página já estava ociosa. Por
   * isso, no alvo moderno, o sinal é a resposta do endpoint.
   *
   * Sem isto, um `goto('/cart')` logo depois do clique cancela a requisição em
   * voo e o carrinho aparece vazio.
   */
  protected async mutateOrder(action: () => Promise<void>): Promise<void> {
    if (IS_LEGACY) {
      await action()
    } else {
      await Promise.all([
        this.page.waitForResponse(
          (response) => /\/api\/(cart|checkout)/.test(response.url()),
          { timeout: 15_000 },
        ),
        action(),
      ])
    }
    await this.settle()
  }
}
