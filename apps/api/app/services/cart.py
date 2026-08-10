"""Operações de carrinho."""

from __future__ import annotations

import uuid as uuid_module

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.errors import AppError
from app.models import Order, OrderItem, Product
from app.schemas.cart import CartItemOut, CartOut
from app.schemas.product import ProductSummary
from app.services import pricing


def is_valid_cart_id(value: str) -> bool:
    try:
        uuid_module.UUID(value)
    except (ValueError, AttributeError, TypeError):
        return False
    return True


def find_open_cart(db: Session, cart_id: str | None) -> Order | None:
    """Carrinho aberto do visitante, ou `None`.

    Nunca cria. Um id desconhecido, já fechado ou de um banco que foi
    recriado é tratado como ausente — o cliente recebe carrinho vazio e
    sobrescreve o id guardado, em vez de entrar num loop de erro.
    """
    if not cart_id or not is_valid_cart_id(cart_id):
        return None
    return db.scalar(select(Order).where(Order.uuid == cart_id, Order.is_open.is_(True)))


def create_cart(db: Session) -> Order:
    cart = Order()
    db.add(cart)
    db.flush()
    return cart


def get_or_create_cart(db: Session, cart_id: str | None) -> Order:
    """Usado só pelas operações de escrita — leitura nunca cria registro."""
    return find_open_cart(db, cart_id) or create_cart(db)


def add_item(db: Session, cart: Order, product_id: int, quantity: int) -> Order:
    product = db.get(Product, product_id)
    if product is None:
        raise AppError(404, "Produto não encontrado", "PRODUCT_NOT_FOUND")

    existing = db.scalar(
        select(OrderItem).where(OrderItem.order_id == cart.id, OrderItem.product_id == product_id)
    )

    if existing is not None:
        # Adicionar o mesmo produto de novo soma as quantidades, em vez de
        # criar uma segunda linha do mesmo item.
        existing.quantity += quantity
    else:
        db.add(
            OrderItem(
                order_id=cart.id,
                product_id=product.id,
                quantity=quantity,
                price=product.price,
            )
        )

    db.flush()
    db.refresh(cart)
    return cart


def _owned_item(db: Session, cart: Order, item_id: int) -> OrderItem:
    """Busca o item **dentro do carrinho do visitante**.

    O filtro por `order_id` é o que impede alterar ou remover item de outra
    pessoa. Item de outro carrinho devolve 404, não 403: confirmar que o id
    existe já seria informação a mais.
    """
    item = db.scalar(
        select(OrderItem).where(OrderItem.id == item_id, OrderItem.order_id == cart.id)
    )
    if item is None:
        raise AppError(404, "Item não encontrado no carrinho", "CART_ITEM_NOT_FOUND")
    return item


def update_item_quantity(db: Session, cart: Order, item_id: int, quantity: int) -> Order:
    item = _owned_item(db, cart, item_id)

    if quantity <= 0:
        db.delete(item)
    else:
        item.quantity = quantity

    db.flush()
    db.refresh(cart)
    return cart


def remove_item(db: Session, cart: Order, item_id: int) -> Order:
    item = _owned_item(db, cart, item_id)
    db.delete(item)
    db.flush()
    db.refresh(cart)
    return cart


def clear(db: Session, cart: Order) -> Order:
    for item in list(cart.items):
        db.delete(item)
    db.flush()
    db.refresh(cart)
    return cart


def to_schema(cart: Order | None) -> CartOut:
    """Serializa o carrinho, com os totais recalculados a partir dos itens."""
    if cart is None:
        return CartOut()

    subtotal, shipping, total = pricing.totals_for(cart.items)

    return CartOut(
        id=cart.uuid,
        items=[
            CartItemOut(
                id=item.id,
                product=ProductSummary.model_validate(item.product),
                quantity=item.quantity,
                unit_price=item.price,
                line_total=pricing.quantize(item.line_total),
            )
            for item in cart.items
        ],
        item_count=sum(item.quantity for item in cart.items),
        subtotal=subtotal,
        shipping=shipping,
        total=total,
    )
