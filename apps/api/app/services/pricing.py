"""Cálculo de valores do pedido.

Ponto único de verdade sobre preço. No monolito o frete estava hardcoded em
dois lugares e o subtotal era calculado de duas formas diferentes — o carrinho
usava o preço congelado no item, o checkout usava o preço vivo do produto —,
então as duas telas podiam mostrar totais distintos.
"""

from collections.abc import Iterable
from decimal import ROUND_HALF_UP, Decimal

from app.config import get_settings
from app.models import OrderItem

_CENTS = Decimal("0.01")


def quantize(value: Decimal) -> Decimal:
    """Arredonda para centavos, como o cliente vê."""
    return value.quantize(_CENTS, rounding=ROUND_HALF_UP)


def subtotal_of(items: Iterable[OrderItem]) -> Decimal:
    """Soma das linhas, sempre pelo preço congelado no item.

    Usar `item.product.price` aqui faria uma mudança de preço reescrever
    retroativamente o carrinho de quem já estava comprando.
    """
    return quantize(sum((item.line_total for item in items), Decimal("0.00")))


def shipping_for(subtotal: Decimal) -> Decimal:
    """Frete fixo — e zero quando não há o que entregar."""
    if subtotal <= 0:
        return Decimal("0.00")
    return quantize(get_settings().shipping_fee)


def totals_for(items: Iterable[OrderItem]) -> tuple[Decimal, Decimal, Decimal]:
    """Devolve `(subtotal, frete, total)`."""
    materialized = list(items)
    subtotal = subtotal_of(materialized)
    shipping = shipping_for(subtotal)
    return subtotal, shipping, quantize(subtotal + shipping)
