# Fake Shop

Loja de demonstração em arquitetura frontend / backend, mantida como monorepo.

| Camada | Stack | Porta |
|---|---|---|
| [`apps/web`](apps/web) | React 19 · Vite · TypeScript · Tailwind | **5173** — é por aqui que você entra |
| [`apps/api`](apps/api) | FastAPI · SQLAlchemy 2 · Alembic · PostgreSQL | 8000 — `/docs` e `/metrics` |
| [`e2e`](e2e) | Playwright | — |

> Este é um projeto novo, escrito a partir do monolito Flask publicado em
> [KubeDev/fake-shop](https://github.com/KubeDev/fake-shop). Aquele repositório
> tem vulnerabilidades intencionais e segue disponível para exercícios de
> SAST/SCA/DAST; **este aqui não as reproduz**.

## Subir

```bash
cp .env.example .env      # defina DB_PASSWORD — não há default no código
make up                   # http://localhost:5173
```

`make help` lista os demais alvos; `make logs-f` sobe em primeiro plano.

Há **um único `docker-compose.yml`, e ele é o ambiente de desenvolvimento**:
a API recarrega ao salvar (`uvicorn --reload`) e o front tem HMR, os dois por
bind mount. Não existe compose de produção — se um dia existir, os estágios
`build`/`runtime` do `apps/web/Dockerfile` e o `nginx.conf` são o ponto de
partida, mas hoje nada os constrói.

Sem `.env`, a API **falha no boot**. É proposital: um default de senha no
código é um segredo versionado, e falhar ruidosamente é melhor que subir
apontando para o banco errado.

Depois de mexer no `package.json` do front, o `node_modules` da imagem precisa
ser reconstruído — o volume anônimo que o protege do bind mount sobrevive a um
`down` comum:

```bash
docker compose down -v && make up
```

## Variáveis de ambiente

| Variável | Default | Descrição |
|---|---|---|
| `DB_HOST` `DB_PORT` `DB_USER` `DB_PASSWORD` `DB_NAME` | — | Conexão PostgreSQL. Sem default: ausência derruba o boot. |
| `CORS_ORIGINS` | vazio | Origens permitidas, separadas por vírgula. Normalmente vazio — ver abaixo. |
| `MEDIA_BASE_URL` | `/static/products` | Prefixo das imagens de produto. Aponte para um CDN se quiser. |
| `SHIPPING_FEE` | `10.00` | Frete fixo. |
| `ENVIRONMENT` | `prod` | `dev` \| `test` \| `prod`. O compose fixa `dev`, então não vem do `.env`. |
| `VITE_API_URL` | vazio | Escape hatch do front para apontar a uma API remota. |

## Como as camadas conversam

O SPA sempre chama **`/api` relativo**, nunca uma URL absoluta — quem resolve
o destino é o proxy do Vite, que encaminha `/api` e `/static` para a API. Como
tudo sai da mesma origem, o CORS não entra em jogo: `CORS_ORIGINS` existe só
para quem quiser rodar o front fora do compose, apontando para uma API remota.

O carrinho é identificado pelo header **`X-Cart-Id`**, guardado em
`localStorage` — não há cookie. Como nada é enviado automaticamente pelo
browser, a superfície de CSRF desaparece; e como `X-Cart-Id` é um header
não-simples, toda requisição cross-origin dispara preflight, o que faz a
allowlist de origens valer de fato. Ver [ADR 0003](docs/adr/0003-carrinho-via-header-x-cart-id.md).

Documentação da API: `http://localhost:8000/docs`.

## Verificar

```bash
make test     # pytest na API
make lint     # ruff + mypy na API, eslint + tsc no front
make e2e      # Playwright contra a stack em :5173
make audit    # pip-audit e npm audit
```

A suíte e2e foi escrita **primeiro contra o monolito original** e depois
reapontada para esta implementação — é o que prova que o comportamento
sobreviveu à reescrita. Ela roda nos dois alvos; ver [`e2e/README.md`](e2e/README.md).

## O que mudou em relação ao monolito

O código antigo serviu de especificação, não de base. Os pontos em que este
projeto se comporta diferente, todos cobertos por teste:

| Monolito | Aqui |
|---|---|
| O checkout fechava o pedido aberto mais antigo do banco — com dois visitantes simultâneos, um finalizava o carrinho do outro (`index.py:90`) | Opera sobre o carrinho do `X-Cart-Id` |
| Qualquer `item_id` podia ser alterado ou removido por qualquer visitante | Item de outro carrinho devolve 404 |
| Pedido consultado por número de 6 dígitos — varrível em minutos, e a página mostra nome, e-mail e endereço | Consulta por UUID; o número é só rótulo de exibição |
| Número do cartão, validade e **CVV** gravados em texto plano | Nada disso é persistido; só bandeira e últimos quatro dígitos ([ADR 0004](docs/adr/0004-sem-dados-de-cartao.md)) |
| Subtotal calculado de duas formas — carrinho e checkout podiam divergir | Um único ponto de cálculo, sempre pelo preço congelado no item |
| `total_price` nunca era gravado | Congelado no fechamento |
| Recomendações incluíam o próprio produto | Excluído da consulta |
| Botões +/− de quantidade sem efeito (o `main.js` estourava antes de ligá-los) | Funcionam |
| `R$ 1299.0` | `R$ 1.299,00` |

## Operação

**Carrinhos abandonados.** Todo visitante que adiciona um item cria uma linha
em `orders` que nunca fecha, e nada expira sozinho. Há índice em `created_at`
para uma limpeza periódica:

```sql
delete from orders
 where is_open and created_at < now() - interval '30 days';
```

**Métricas.** `/metrics` responde na API (`:8000`) e **não** é proxiado pelo
front — métricas não vão para a internet. Um worker uvicorn por container,
escalando por réplicas: cada uma é um target Prometheus separado.

**Migrations.** Rodam no serviço `api-migrate`, uma vez, antes de a API subir —
e não no entrypoint dela. Com réplicas, N containers rodando
`alembic upgrade head` ao mesmo tempo disputam lock. É também o padrão que vira
`initContainer`/`Job` no Kubernetes.

**Kubernetes.** Os manifestos de `web` e `api` estão em [`k8s/`](k8s/), em
Kustomize puro, usando os estágios `runtime` dos Dockerfiles — que o compose
não constrói. Só o `web` é exposto; o Postgres fica de fora.
Ver [`k8s/README.md`](k8s/README.md) e
[ADR 0005](docs/adr/0005-deploy-em-kubernetes-com-kustomize.md).

## Pendências

O que está aberto, e o que fecharia cada item.

**Repositório sem remote.** O histórico começa do zero aqui; o monolito
original segue publicado em `KubeDev/fake-shop`. Falta decidir para onde este
vai — `git remote add origin …` e o primeiro push.

**O CI nunca rodou.** Sem remote, o `.github/workflows/ci.yml` não foi
exercitado pelo GitHub Actions. Validei localmente as partes que dava para
validar — o passo de drift do Alembic, a geração do `openapi.json` sem banco, o
`docker compose up --wait` — mas o workflow inteiro é código não executado, e
provavelmente vai precisar de um ou dois ajustes na primeira execução.

**Estágios de produção sem pipeline.** Os dois Dockerfiles têm
`build`/`runtime`, e existe um `apps/web/nginx.conf` com o fallback do SPA e o
proxy de `/api`. Agora eles têm consumidor — os manifestos em [`k8s/`](k8s/) —
mas nada os constrói nem os testa automaticamente: o compose usa só o estágio
`dev` e o CI não monta imagem. Enquanto for assim, o que roda em produção é
código que ninguém exercita.

**Carrinhos abandonados acumulam.** Todo visitante que adiciona um item cria
uma linha em `orders` que nunca fecha. A query de limpeza está na seção
[Operação](#operação) e o índice em `created_at` existe, mas nenhum job a roda.

**Um advisory de dependência em espera.** `react-router` está inteiro dentro da
faixa de [GHSA-qwww-vcr4-c8h2](https://github.com/advisories/GHSA-qwww-vcr4-c8h2)
(CSRF em modo RSC), que não se aplica a um SPA Vite, e não há versão corrigida
publicada. A exceção está registrada em
[`apps/web/audit-allowlist.json`](apps/web/audit-allowlist.json) com motivo e
condição de saída: remover quando sair uma versão acima de 8.2.0.

**Os tipos do front são gerados à mão.** `npm run gen:types` atualiza
`apps/web/src/types/api.ts` a partir do `openapi.json`, e o CI só *detecta* a
divergência. Quem mexer no contrato da API precisa lembrar de rodar o comando.

**Não há autenticação.** É decisão de escopo, não descuido: a loja é de
convidado. A consequência prática é que um pedido só é recuperável por quem
tiver a URL com o UUID — não existe "meus pedidos", e limpar o `localStorage`
descarta o carrinho em andamento.

## Decisões

- [0001 — Monorepo com `apps/`, sem ferramenta de orquestração](docs/adr/0001-monorepo-com-apps.md)
- [0002 — FastAPI + SPA React no lugar de Flask SSR](docs/adr/0002-fastapi-e-spa.md)
- [0003 — Carrinho identificado por header `X-Cart-Id`](docs/adr/0003-carrinho-via-header-x-cart-id.md)
- [0004 — Dados de cartão não são persistidos](docs/adr/0004-sem-dados-de-cartao.md)
- [0005 — Deploy em Kubernetes com Kustomize, sem Helm](docs/adr/0005-deploy-em-kubernetes-com-kustomize.md)
