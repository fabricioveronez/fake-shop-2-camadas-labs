import { BasePage } from './BasePage.js'
import type { CheckoutData } from '../fixtures/checkout.js'

export class CheckoutPage extends BasePage {
  async goto(): Promise<void> {
    await this.page.goto('/checkout')
    await this.settle()
  }

  async isOpen(): Promise<boolean> {
    return /\/checkout/.test(new URL(this.page.url()).pathname)
  }

  total(): Promise<number> {
    return this.readSummary('total')
  }

  /**
   * Preenche o formulário. Os campos são localizados por `name`, não por label:
   * no Jinja os `<label>` dos dados de entrega não têm `for`, então
   * `getByLabel` não os alcança. O `name` é o contrato que as duas
   * implementações compartilham.
   */
  async fill(data: CheckoutData): Promise<void> {
    const set = async (name: string, value: string) => {
      await this.page.locator(`[name="${name}"]`).fill(value)
    }

    await set('first_name', data.first_name)
    await set('last_name', data.last_name)
    await set('email', data.email)
    await set('mobile', data.mobile)
    await set('address1', data.address1)
    if (data.address2) await set('address2', data.address2)
    await set('city', data.city)
    await set('state', data.state)
    await set('zip', data.zip)

    await set('card_name', data.card_name)
    await set('card_number', data.card_number)
    await set('expiry_date', data.expiry_date)
    await set('cvv', data.cvv)
  }

  async submit(): Promise<void> {
    await this.mutateOrder(() =>
      this.page.getByRole('button', { name: /efetuar o pagamento|finalizar compra/i }).click(),
    )

    // A resposta do checkout chega antes de a tela trocar: no SPA ainda falta
    // o roteador navegar. Esperamos o desfecho — a confirmação, ou uma
    // mensagem de erro no formulário. Ficar só com a URL travaria 10s sempre
    // que o pagamento fosse recusado.
    const reachedConfirmation = this.page
      .waitForURL(/\/order[-_]confirmation\//, { timeout: 10_000 })
      .catch(() => undefined)
    const showedError = this.page
      .locator('[role="alert"]')
      .first()
      .waitFor({ state: 'visible', timeout: 10_000 })
      .catch(() => undefined)

    await Promise.race([reachedConfirmation, showedError])
    await this.settle()
  }

  async fillAndSubmit(data: CheckoutData): Promise<void> {
    await this.fill(data)
    await this.submit()
  }
}
