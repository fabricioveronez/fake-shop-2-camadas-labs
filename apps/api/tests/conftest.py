"""Fixtures dos testes.

Cada teste roda contra um banco limpo: as tabelas são recriadas e o catálogo
semeado, então as asserções podem citar valores concretos (preço do produto 1,
subtotal esperado) em vez de só verificar consistência interna.

Isso acontece num banco **separado**, `<DB_NAME>_test`, criado aqui se não
existir. Sem essa separação, rodar os testes apagaria o carrinho em que a
pessoa estivesse trabalhando no ambiente de desenvolvimento — que aponta para
o mesmo Postgres.
"""

import os

import psycopg

from app.config import get_settings


def _use_dedicated_test_database() -> None:
    settings = get_settings()
    test_database = f"{settings.db_name}_test"

    with psycopg.connect(
        host=settings.db_host,
        port=settings.db_port,
        user=settings.db_user,
        password=settings.db_password.get_secret_value(),
        dbname="postgres",
        autocommit=True,
    ) as connection:
        exists = connection.execute(
            "select 1 from pg_database where datname = %s", (test_database,)
        ).fetchone()
        if not exists:
            # Identificador não pode ser parametrizado; vem do próprio .env.
            connection.execute(f'create database "{test_database}"')

    os.environ["DB_NAME"] = test_database
    get_settings.cache_clear()


# Precisa rodar antes de `app.db` ser importado: o engine é criado no import,
# e depois disso a URL de conexão já está congelada.
_use_dedicated_test_database()

from collections.abc import Iterator  # noqa: E402

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.db import SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Base  # noqa: E402
from app.seed import seed_products  # noqa: E402


@pytest.fixture(autouse=True)
def clean_database() -> Iterator[None]:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        seed_products(session)
    yield


@pytest.fixture
def db() -> Iterator[Session]:
    with SessionLocal() as session:
        yield session


@pytest.fixture
def client() -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def checkout_payload() -> dict:
    return {
        "customer": {
            "first_name": "Ana",
            "last_name": "Silva",
            "email": "ana.silva@example.com",
            "mobile": "11999998888",
        },
        "shipping_address": {
            "address1": "Rua das Laranjeiras, 100",
            "address2": "Apto 42",
            "city": "São Paulo",
            "state": "SP",
            "country": "Brasil",
            "zip_code": "01001-000",
        },
        "payment": {
            "card_name": "ANA SILVA",
            "card_number": "4242424242424242",
            "expiry_date": "12/34",
            "cvv": "123",
        },
    }


@pytest.fixture
def cart_with_item(client: TestClient) -> tuple[str, int]:
    """Cria um carrinho com o produto 1 e devolve `(cart_id, item_id)`."""
    response = client.post("/api/cart/items", json={"product_id": 1, "quantity": 2})
    assert response.status_code == 201
    body = response.json()
    return body["id"], body["items"][0]["id"]
