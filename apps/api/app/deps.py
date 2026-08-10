"""Dependências compartilhadas pelos routers."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.db import get_db
from app.errors import AppError
from app.models import Order
from app.services import cart as cart_service

DbSession = Annotated[Session, Depends(get_db)]

CartIdHeader = Annotated[
    str | None,
    Header(
        alias="X-Cart-Id",
        description="UUID do carrinho. Ausente na primeira visita.",
    ),
]


def _validate_header(cart_id: str | None) -> None:
    if cart_id and not cart_service.is_valid_cart_id(cart_id):
        raise AppError(400, "X-Cart-Id não é um UUID válido", "INVALID_CART_ID")


def get_cart(db: DbSession, x_cart_id: CartIdHeader = None) -> Order | None:
    """Leitura: devolve o carrinho aberto ou `None`. Nunca cria, nunca 404."""
    _validate_header(x_cart_id)
    return cart_service.find_open_cart(db, x_cart_id)


def get_or_create_cart(db: DbSession, x_cart_id: CartIdHeader = None) -> Order:
    """Escrita: resolve o carrinho ou cria um novo e devolve o id ao cliente."""
    _validate_header(x_cart_id)
    return cart_service.get_or_create_cart(db, x_cart_id)


def require_cart(cart: Annotated[Order | None, Depends(get_cart)]) -> Order:
    """Mutação de item e checkout: exige um carrinho existente."""
    if cart is None:
        raise AppError(404, "Carrinho não encontrado", "CART_NOT_FOUND")
    return cart


CurrentCart = Annotated[Order | None, Depends(get_cart)]
WritableCart = Annotated[Order, Depends(get_or_create_cart)]
ExistingCart = Annotated[Order, Depends(require_cart)]
