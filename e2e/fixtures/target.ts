/**
 * Contra qual implementação a suíte está rodando.
 *
 * `legacy`  — o monolito Flask (SSR com Jinja2), usado para gravar a baseline
 *             de comportamento antes do projeto novo existir.
 * `modern`  — o monorepo FastAPI + React (default).
 *
 * Este é o **único** ponto onde a suíte sabe que existem duas implementações.
 * Os specs descrevem comportamento e nunca leem esta flag diretamente, com uma
 * exceção deliberada: `test.fail(IS_LEGACY, '…')` para os comportamentos que o
 * monolito erra de propósito (ver README da suíte). Assim a mesma suíte roda
 * verde nos dois alvos e cada divergência fica documentada no código.
 */
export const TARGET = (process.env.E2E_TARGET ?? 'modern') as 'legacy' | 'modern'

export const IS_LEGACY = TARGET === 'legacy'
export const IS_MODERN = TARGET === 'modern'

/** Frete fixo da loja, em reais. */
export const SHIPPING_FEE = 10
