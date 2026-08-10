from fastapi import APIRouter, status

from app.deps import DbSession, ExistingCart
from app.schemas.checkout import CheckoutIn
from app.schemas.order import OrderOut
from app.services import orders as orders_service

router = APIRouter(tags=["checkout"])


@router.post(
    "/checkout",
    response_model=OrderOut,
    status_code=status.HTTP_201_CREATED,
    responses={
        402: {"description": "Pagamento recusado"},
        404: {"description": "Carrinho não encontrado"},
        409: {"description": "Carrinho vazio"},
    },
)
def checkout(db: DbSession, cart: ExistingCart, payload: CheckoutIn) -> OrderOut:
    """Fecha o carrinho do visitante identificado pelo header `X-Cart-Id`.

    Os dados de cartão chegam aqui, são validados, autorizam o pagamento e são
    descartados: só bandeira e últimos quatro dígitos ficam no pedido.
    """
    order = orders_service.checkout(db, cart, payload)
    return orders_service.to_schema(order)
