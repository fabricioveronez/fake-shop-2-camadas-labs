from decimal import Decimal

from sqlalchemy import Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100))

    # Numeric, nunca Float: dinheiro em ponto flutuante acumula erro de
    # arredondamento, e aqui os valores somam em subtotal e total.
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2))

    description: Mapped[str | None] = mapped_column(String(500), default=None)
    short_description: Mapped[str | None] = mapped_column(String(200), default=None)

    # Só o nome do arquivo (ex.: "product-1.jpg"). A URL pública é montada no
    # schema, a partir de MEDIA_BASE_URL — o cliente nunca concatena caminho.
    image: Mapped[str | None] = mapped_column(String(255), default=None)

    def __repr__(self) -> str:
        return f"<Product id={self.id} name={self.name!r}>"
