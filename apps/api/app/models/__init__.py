"""Models SQLAlchemy.

Importar tudo aqui garante que os mappers estejam registrados em
`Base.metadata` sempre que alguém importar `app.models` — o Alembic depende
disso para o autogenerate enxergar as três tabelas.
"""

from app.models.base import Base
from app.models.order import Order, OrderItem, PaymentStatus
from app.models.product import Product

__all__ = ["Base", "Order", "OrderItem", "PaymentStatus", "Product"]
