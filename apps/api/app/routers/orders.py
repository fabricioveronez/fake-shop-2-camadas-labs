from fastapi import APIRouter

from app.deps import DbSession
from app.errors import AppError
from app.schemas.order import OrderOut
from app.services import cart as cart_service
from app.services import orders as orders_service

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get(
    "/{order_uuid}", response_model=OrderOut, responses={404: {"description": "Não encontrado"}}
)
def get_order(db: DbSession, order_uuid: str) -> OrderOut:
    """Consulta um pedido fechado pelo seu UUID.

    A consulta é por `uuid`, não pelo `order_number` de 6 dígitos: 900 mil
    valores são varríveis em minutos, e a resposta traz nome, e-mail e
    endereço do comprador.
    """
    if not cart_service.is_valid_cart_id(order_uuid):
        raise AppError(404, "Pedido não encontrado", "ORDER_NOT_FOUND")

    order = orders_service.find_by_uuid(db, order_uuid)
    return orders_service.to_schema(order)
