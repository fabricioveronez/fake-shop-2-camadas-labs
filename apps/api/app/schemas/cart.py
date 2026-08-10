from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.product import ProductSummary


class CartItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product: ProductSummary
    quantity: int
    # Preço congelado quando o item entrou no carrinho.
    unit_price: Decimal
    line_total: Decimal


class CartOut(BaseModel):
    """O carrinho inteiro.

    Toda mutação devolve este objeto completo — o cliente nunca precisa
    refazer um GET depois de adicionar, alterar ou remover item, e os totais
    não têm como divergir dos itens.
    """

    # `null` quando o visitante ainda não tem carrinho. Não é erro: é o estado
    # inicial de quem acabou de chegar.
    id: str | None = Field(default=None, description="UUID do carrinho (header X-Cart-Id)")
    items: list[CartItemOut] = Field(default_factory=list)
    item_count: int = 0
    subtotal: Decimal = Decimal("0.00")
    shipping: Decimal = Decimal("0.00")
    total: Decimal = Decimal("0.00")


class AddCartItemIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    product_id: int = Field(ge=1)
    quantity: int = Field(default=1, ge=1, le=999)


class UpdateCartItemIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # Zero é válido e significa remover — mesma semântica do monolito.
    quantity: int = Field(ge=0, le=999)
