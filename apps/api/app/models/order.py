from __future__ import annotations

import uuid as uuid_module
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.product import Product


def _utcnow() -> datetime:
    return datetime.now(UTC)


class PaymentStatus:
    """Estados de pagamento de um pedido."""

    PENDING = "pending"
    PAID = "paid"
    DECLINED = "declined"


class Order(Base):
    """Um pedido.

    Enquanto `is_open` é verdadeiro, este registro *é* o carrinho do visitante,
    identificado publicamente por `uuid` (o valor do header `X-Cart-Id`). O
    checkout preenche os dados do comprador e fecha o pedido.

    Não há colunas de cartão. O formulário coleta PAN, validade e CVV, mas
    nada disso é persistido — ver `services/payments.py` e o ADR 0004.
    """

    __tablename__ = "orders"
    __table_args__ = (
        Index("ix_orders_uuid_is_open", "uuid", "is_open"),
        Index("ix_orders_created_at", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    uuid: Mapped[str] = mapped_column(
        String(36),
        unique=True,
        default=lambda: str(uuid_module.uuid4()),
    )
    # Rótulo curto para o cliente citar no suporte. Não é identificador de
    # consulta: seis dígitos são enumeráveis, então a API busca por `uuid`.
    order_number: Mapped[str | None] = mapped_column(String(10), unique=True, default=None)

    is_open: Mapped[bool] = mapped_column(Boolean, default=True)
    payment_status: Mapped[str] = mapped_column(String(20), default=PaymentStatus.PENDING)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    # --- Comprador (preenchidos no checkout) ---
    user_name: Mapped[str | None] = mapped_column(String(100), default=None)
    user_email: Mapped[str | None] = mapped_column(String(100), default=None)
    mobile: Mapped[str | None] = mapped_column(String(20), default=None)

    # --- Endereço de entrega ---
    address1: Mapped[str | None] = mapped_column(String(255), default=None)
    address2: Mapped[str | None] = mapped_column(String(255), default=None)
    city: Mapped[str | None] = mapped_column(String(100), default=None)
    state: Mapped[str | None] = mapped_column(String(100), default=None)
    country: Mapped[str | None] = mapped_column(String(100), default="Brasil")
    zip_code: Mapped[str | None] = mapped_column(String(20), default=None)

    # --- Pagamento: apenas o que é seguro guardar ---
    card_brand: Mapped[str | None] = mapped_column(String(20), default=None)
    card_last4: Mapped[str | None] = mapped_column(String(4), default=None)

    # --- Valores congelados no fechamento ---
    subtotal: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"))
    shipping: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"))
    total_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"))

    # selectin, não lazy: no FastAPI a serialização acontece possivelmente
    # depois que a sessão fechou, e lazy load daria DetachedInstanceError.
    # De quebra, elimina o N+1 ao montar o carrinho.
    items: Mapped[list[OrderItem]] = relationship(
        back_populates="order",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="OrderItem.id",
    )

    def __repr__(self) -> str:
        return f"<Order id={self.id} uuid={self.uuid} open={self.is_open}>"


class OrderItem(Base):
    __tablename__ = "order_items"
    __table_args__ = (Index("ix_order_items_order_id", "order_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"))
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    quantity: Mapped[int] = mapped_column(Integer, default=1)

    # Preço no momento em que o item entrou no carrinho. Toda soma usa este
    # valor, nunca `product.price` — senão uma mudança de preço reescreveria
    # retroativamente o carrinho de quem já estava comprando.
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2))

    order: Mapped[Order] = relationship(back_populates="items")
    product: Mapped[Product] = relationship(lazy="selectin")

    @property
    def line_total(self) -> Decimal:
        return self.price * self.quantity

    def __repr__(self) -> str:
        return f"<OrderItem id={self.id} product={self.product_id} qty={self.quantity}>"
