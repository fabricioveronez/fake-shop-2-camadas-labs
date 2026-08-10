SHELL := /bin/bash
COMPOSE := docker compose

.DEFAULT_GOAL := help

.PHONY: help
help: ## Lista os alvos disponíveis
	@grep -hE '^[a-zA-Z0-9_-]+:.*?## ' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

.PHONY: up
up: ## Sobe a stack em http://localhost:5173 (API recarregando, front com HMR)
	$(COMPOSE) up -d --build

.PHONY: logs-f
logs-f: ## Sobe a stack em primeiro plano, com os logs na tela
	$(COMPOSE) up --build

.PHONY: down
down: ## Derruba a stack, preservando o volume do banco
	$(COMPOSE) down

.PHONY: reset
reset: ## Derruba a stack e APAGA o volume do banco
	$(COMPOSE) down -v

.PHONY: logs
logs: ## Segue os logs de todos os serviços
	$(COMPOSE) logs -f

.PHONY: migrate
migrate: ## Aplica as migrations pendentes
	$(COMPOSE) run --rm api-migrate

.PHONY: revision
revision: ## Gera uma revision nova. Uso: make revision m="descricao"
	$(COMPOSE) run --rm api alembic revision --autogenerate -m "$(m)"

.PHONY: test
test: ## Roda os testes unitários da API
	$(COMPOSE) run --rm api pytest

.PHONY: lint
lint: ## Roda ruff e mypy na API, eslint e tsc no front
	$(COMPOSE) run --rm api ruff check .
	$(COMPOSE) run --rm api ruff format --check .
	$(COMPOSE) run --rm api mypy app
	$(COMPOSE) run --rm web npm run lint
	$(COMPOSE) run --rm web npm run typecheck

.PHONY: format
format: ## Formata o código da API com ruff
	$(COMPOSE) run --rm api ruff format .
	$(COMPOSE) run --rm api ruff check --fix .

# Zera os pedidos entre um teste e outro, para nenhum caso herdar estado de
# execuções anteriores.
E2E_ENV := E2E_BASE_URL=http://localhost:5173 E2E_RESET_CMD=../scripts/reset-orders.sh

.PHONY: e2e
e2e: ## Roda a suíte Playwright contra a stack em :5173
	cd e2e && $(E2E_ENV) npx playwright test

.PHONY: e2e-ui
e2e-ui: ## Abre a suíte Playwright em modo interativo
	cd e2e && $(E2E_ENV) npx playwright test --ui

.PHONY: audit
audit: ## Verifica dependências vulneráveis nas duas camadas
	# Audita o ambiente instalado, não o requirements.txt: é o que de fato
	# roda, e pega também o que entrou por fora do lock.
	$(COMPOSE) run --rm api pip-audit
	$(COMPOSE) run --rm web npm run audit:ci
