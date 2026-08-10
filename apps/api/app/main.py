"""Aplicação FastAPI."""

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from prometheus_fastapi_instrumentator import Instrumentator

from app.config import get_settings
from app.errors import register_error_handlers
from app.routers import cart, checkout, health, orders, products

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"

settings = get_settings()

app = FastAPI(
    title="Fake Shop API",
    version="1.0.0",
    description=(
        "API da loja. O carrinho é identificado pelo header `X-Cart-Id`, "
        "devolvido no corpo e no header de toda resposta de carrinho."
    ),
    docs_url="/docs",
    openapi_url="/openapi.json",
)

# Sem credenciais: o carrinho viaja num header explícito, não num cookie, então
# não há nada que o browser envie sozinho — e a superfície de CSRF desaparece.
# `X-Cart-Id` é header não-simples, o que força preflight e faz a allowlist de
# origens valer de fato.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-Cart-Id"],
    expose_headers=["X-Cart-Id"],
    max_age=600,
)

register_error_handlers(app)

app.include_router(health.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(cart.router, prefix="/api")
app.include_router(checkout.router, prefix="/api")
app.include_router(orders.router, prefix="/api")

# Imagens de produto. A mídia acompanha o recurso que a referencia: o schema
# devolve `image_url` pronta e o cliente nunca monta caminho.
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# /metrics fica fora de /api e não é proxiado pelo nginx — métricas não vão
# para a internet. Um worker por container, escalando por réplicas, dispensa o
# modo multiprocess e o PROMETHEUS_MULTIPROC_DIR que o monolito exigia.
Instrumentator(
    excluded_handlers=["/metrics", "/api/health", "/api/health/ready"],
).instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)
