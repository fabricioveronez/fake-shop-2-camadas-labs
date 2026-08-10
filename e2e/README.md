# Suíte e2e

Descreve o **comportamento** da loja, não o seu HTML. A mesma suíte roda contra
duas implementações:

- `legacy` — o monolito Flask original (SSR com Jinja2), servido em `:5000`
- `modern` — o monorepo FastAPI + React, servido em `:5173` (default)

Isso existe porque o projeto novo foi escrito a partir do antigo: a suíte foi
gravada primeiro contra o monolito, e é o que prova que o comportamento
sobreviveu à reescrita.

## Rodando

```bash
npm install
npx playwright install --with-deps chromium
```

Contra o monorepo — o caminho normal é pelo `Makefile` da raiz, que já cuida
das variáveis:

```bash
make up        # sobe a stack
make e2e       # roda a suíte
make e2e-ui    # modo interativo
```

Contra o monolito, com ele no ar em `:5000`:

```bash
E2E_TARGET=legacy E2E_BASE_URL=http://localhost:5000 \
  E2E_RESET_CMD='<comando que zera os pedidos>' \
  npx playwright test
```

`E2E_RESET_CMD` roda antes de cada teste e zera carrinhos e pedidos. É
opcional, mas praticamente obrigatório contra o monolito — ver a última seção.
Para o monorepo, o script pronto é `../scripts/reset-orders.sh`.

## Como uma suíte serve às duas implementações

Os specs nunca tocam em DOM. Toda leitura de tela passa pelos page objects em
`pages/`, cujos locators são uniões `[data-testid="x"], .classe-antiga` — a
primeira metade casa com o React, a segunda com o Jinja.

Onde a diferença não é de seletor mas de mecânica, o page object ramifica em
`IS_LEGACY` (`fixtures/target.ts`). Hoje são dois pontos: alterar quantidade no
carrinho (no Jinja é submit de form, no React é o campo que dispara a mutação) e
a rota da confirmação (número de 6 dígitos vs uuid).

## Divergências deliberadas

Parte do comportamento do monolito é bug, e alguns fluxos já estavam quebrados.
Nesses casos a suíte afirma o comportamento **correto**, e marca
`test.fail(IS_LEGACY, '…')` — o teste passa nos dois alvos, falhando como
esperado contra o monolito. Cada marcador aponta a linha do código original.

| Comportamento | Monolito |
|---|---|
| Cada visitante finaliza o próprio carrinho | `index.py:90` fecha o pedido aberto mais antigo, de qualquer um |
| Relacionados não incluem o próprio produto | `index.py:191` — `Product.query.limit(4)` sem filtro |
| Stepper +/− incrementa a quantidade | `main.js:37` estoura porque `owlCarousel` não existe, e aborta antes de ligar os handlers |
| Pedido inexistente mostra "não encontrado" | `index.py:126` passa `order=None` ao template → 500 |

## Por que `E2E_RESET_CMD` importa tanto no monolito

`index.py:90` fecha `Order.query.filter_by(is_open=True).first()`. Qualquer
carrinho abandonado por um teste anterior fica na frente na fila, e é ele que o
teste seguinte finaliza. Sem limpar os pedidos entre os casos, a baseline vira
ruído.
