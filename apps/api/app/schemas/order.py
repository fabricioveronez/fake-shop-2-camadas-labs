from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    product_id: int
    product_name: str
    quantity: int
    unit_price: Decimal
    line_total: Decimal


class PaymentOut(BaseModel):
    """O que é seguro contar sobre o pagamento.

    Bandeira e últimos quatro dígitos bastam para o cliente reconhecer o
    cartão e para o suporte identificar a transação. Nada além disso existe
    no banco.
    """

    brand: str | None = None
    last4: str | None = None


class OrderOut(BaseModel):
    # Identificador de consulta. O `order_number` de 6 dígitos é rótulo de
    # exibição — enumerável demais para ser chave de acesso.
    order_uuid: str
    order_number: str | None = None
    status: str

    created_at: datetime
    paid_at: datetime | None = None

    customer_name: str | None = None
    customer_email: str | None = None

    address1: str | None = None
    address2: str | None = None
    city: str | None = None
    state: str | None = None
    country: str | None = None
    zip_code: str | None = None
    mobile: str | None = None

    items: list[OrderItemOut]
    subtotal: Decimal
    shipping: Decimal
    total: Decimal

    payment: PaymentOut
