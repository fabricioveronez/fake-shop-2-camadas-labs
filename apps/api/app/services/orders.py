"""Fechamento e consulta de pedidos."""

from __future__ import annotations

import secrets
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.errors import AppError
from app.models import Order, PaymentStatus
from app.schemas.checkout import CheckoutIn
from app.schemas.order import OrderItemOut, OrderOut, PaymentOut
from app.services import payments, pricing

_ORDER_NUMBER_ATTEMPTS = 5


def generate_order_number(db: Session) -> str:
    """Número de 6 dígitos, único.

    `secrets.randbelow` em vez de `random.randint` e retry em vez de sorte: a
    coluna é UNIQUE, e com sorteio único uma colisão viraria IntegrityError
    intermitente em produção.
    """
    for _ in range(_ORDER_NUMBER_ATTEMPTS):
        candidate = f"{secrets.randbelow(900_000) + 100_000}"
        taken = db.scalar(select(Order.id).where(Order.order_number == candidate))
        if taken is None:
            return candidate
    raise AppError(503, "Não foi possível gerar o número do pedido", "ORDER_NUMBER_EXHAUSTED")


def checkout(db: Session, cart: Order, data: CheckoutIn) -> Order:
    """Fecha o carrinho do visitante.

    Opera sobre o carrinho recebido — o do header `X-Cart-Id`. O monolito
    fechava `Order.query.filter_by(is_open=True).first()`, o pedido aberto
    mais antigo do banco, então com dois visitantes simultâneos um finalizava
    o carrinho do outro.
    """
    if not cart.items:
        raise AppError(409, "Carrinho vazio", "CART_EMPTY")

    subtotal, shipping, total = pricing.totals_for(cart.items)

    authorization = payments.authorize(data.payment, total)
    if not authorization.approved:
        cart.payment_status = PaymentStatus.DECLINED
        db.flush()
        raise AppError(
            402,
            authorization.decline_reason or "Pagamento recusado",
            "PAYMENT_DECLINED",
        )

    customer = data.customer
    address = data.shipping_address

    cart.user_name = f"{customer.first_name} {customer.last_name}"
    cart.user_email = str(customer.email)
    cart.mobile = customer.mobile

    cart.address1 = address.address1
    cart.address2 = address.address2
    cart.city = address.city
    cart.state = address.state
    cart.country = address.country
    cart.zip_code = address.zip_code

    # Só o que é seguro guardar. PAN, CVV e validade morrem aqui.
    cart.card_brand = authorization.brand
    cart.card_last4 = authorization.last4

    # Valores congelados: o monolito nunca gravava total_price, que ficava 0.0
    # para sempre, e recalculava tudo em runtime.
    cart.subtotal = subtotal
    cart.shipping = shipping
    cart.total_price = total

    cart.payment_status = PaymentStatus.PAID
    cart.paid_at = datetime.now(UTC)
    cart.order_number = generate_order_number(db)
    cart.is_open = False

    try:
        db.flush()
    except IntegrityError as error:  # pragma: no cover - corrida rara
        db.rollback()
        raise AppError(409, "Conflito ao fechar o pedido", "ORDER_CONFLICT") from error

    return cart


def find_by_uuid(db: Session, order_uuid: str) -> Order:
    order = db.scalar(select(Order).where(Order.uuid == order_uuid, Order.is_open.is_(False)))
    if order is None:
        raise AppError(404, "Pedido não encontrado", "ORDER_NOT_FOUND")
    return order


def to_schema(order: Order) -> OrderOut:
    return OrderOut(
        order_uuid=order.uuid,
        order_number=order.order_number,
        status=order.payment_status,
        created_at=order.created_at,
        paid_at=order.paid_at,
        customer_name=order.user_name,
        customer_email=order.user_email,
        address1=order.address1,
        address2=order.address2,
        city=order.city,
        state=order.state,
        country=order.country,
        zip_code=order.zip_code,
        mobile=order.mobile,
        items=[
            OrderItemOut(
                product_id=item.product_id,
                product_name=item.product.name,
                quantity=item.quantity,
                unit_price=item.price,
                line_total=pricing.quantize(item.line_total),
            )
            for item in order.items
        ],
        subtotal=order.subtotal,
        shipping=order.shipping,
        total=order.total_price,
        payment=PaymentOut(brand=order.card_brand, last4=order.card_last4),
    )
