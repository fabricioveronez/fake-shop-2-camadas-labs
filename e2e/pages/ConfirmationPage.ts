import { BasePage } from './BasePage.js'
import { IS_LEGACY } from '../fixtures/target.js'

export class ConfirmationPage extends BasePage {
  /**
   * Abre a confirmação de um pedido que não existe. O identificador difere
   * entre as implementações — número de 6 dígitos no monolito, uuid no SPA —
   * então o conhecimento fica aqui, e não no spec.
   */
  async gotoUnknown(): Promise<void> {
    const path = IS_LEGACY
      ? '/order_confirmation/000000'
      : '/order-confirmation/00000000-0000-4000-8000-000000000000'
    await this.page.goto(path)
    await this.settle()
  }

  /**
   * O caminho difere entre as implementações — `/order_confirmation/<numero>`
   * no monolito, `/order-confirmation/<uuid>` no SPA (uuid porque um número de
   * 6 dígitos é enumerável). A suíte só afirma que chegou na confirmação.
   */
  async isOpen(): Promise<boolean> {
    return /\/order[-_]confirmation\//.test(new URL(this.page.url()).pathname)
  }

  /**
   * Espera o conteúdo da confirmação estar na tela.
   *
   * Chegar na URL não basta no SPA: ele monta a página e só então busca o
   * pedido, então há um intervalo em que a rota já é a certa e a tela ainda
   * mostra "carregando". Os dois alvos exibem o mesmo título, que serve de
   * sinal comum.
   */
  private async waitForLoaded(): Promise<void> {
    await this.page.getByText(/pedido confirmado/i).first().waitFor({ state: 'visible' })
  }

  /** O número do pedido exibido ao cliente. */
  async orderNumber(): Promise<string> {
    await this.waitForLoaded()

    const byTestId = this.page.locator('[data-testid="order-number"]')
    if (await byTestId.count()) return (await byTestId.first().innerText()).trim()

    const body = await this.page.locator('body').innerText()
    const match = body.match(/pedido\s+é\s+(\d{4,10})/i) ?? body.match(/\b(\d{6})\b/)
    if (!match) throw new Error('Não encontrei o número do pedido na confirmação')
    return match[1]
  }

  /** Linhas do resumo do pedido, como texto — os specs casam por substring. */
  async itemLines(): Promise<string[]> {
    await this.waitForLoaded()
    const items = this.page.locator('[data-testid="order-item"], ul li')
    return (await items.allInnerTexts()).map((t) => t.trim()).filter(Boolean)
  }

  /** O texto completo da página, para asserções negativas (ex.: sem CVV). */
  bodyText(): Promise<string> {
    return this.page.locator('body').innerText()
  }
}
