"""Testes de cálculo, sem HTTP.

O monolito calculava o subtotal de duas formas: o carrinho somava o preço
congelado no item, o checkout somava o preço vivo do produto. Se um produto
mudasse de preço, as duas telas divergiam.
"""

from decimal import Decimal

from app.models import OrderItem, Product
from app.services import pricing


def _item(unit_price: str, quantity: int, product_price: str) -> OrderItem:
    item = OrderItem(quantity=quantity, price=Decimal(unit_price))
    item.product = Product(name="x", price=Decimal(product_price))
    return item


def test_subtotal_usa_o_preco_congelado_no_item() -> None:
    # O produto subiu de 100 para 999 depois de entrar no carrinho.
    items = [_item(unit_price="100.00", quantity=2, product_price="999.00")]

    assert pricing.subtotal_of(items) == Decimal("200.00")


def test_frete_fixo_quando_ha_itens() -> None:
    assert pricing.shipping_for(Decimal("50.00")) == Decimal("10.00")


def test_sem_itens_nao_ha_frete() -> None:
    assert pricing.shipping_for(Decimal("0.00")) == Decimal("0.00")


def test_totais_somam_subtotal_e_frete() -> None:
    items = [
        _item(unit_price="1299.00", quantity=2, product_price="1299.00"),
        _item(unit_price="349.00", quantity=3, product_price="349.00"),
    ]

    subtotal, shipping, total = pricing.totals_for(items)

    assert subtotal == Decimal("3645.00")
    assert shipping == Decimal("10.00")
    assert total == Decimal("3655.00")


def test_arredonda_para_centavos() -> None:
    assert pricing.quantize(Decimal("10.005")) == Decimal("10.01")
    assert pricing.quantize(Decimal("10.004")) == Decimal("10.00")
