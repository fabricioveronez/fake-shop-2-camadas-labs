#!/usr/bin/env bash
# Zera carrinhos e pedidos, preservando o catálogo.
#
# Usado pela suíte e2e entre um teste e outro (E2E_RESET_CMD), para que
# nenhum caso herde estado de execuções anteriores.
#
# POSTGRES_USER e POSTGRES_DB já existem dentro do container, então este
# script acompanha o .env sem repetir os valores.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

docker compose -f "$ROOT/docker-compose.yml" --env-file "$ROOT/.env" exec -T postgres \
  sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -q -c "truncate order_items, orders restart identity cascade"'
