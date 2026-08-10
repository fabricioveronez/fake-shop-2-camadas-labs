from fastapi import APIRouter, Response, status

from app.deps import CurrentCart, DbSession, ExistingCart, WritableCart
from app.schemas.cart import AddCartItemIn, CartOut, UpdateCartItemIn
from app.services import cart as cart_service

router = APIRouter(prefix="/cart", tags=["cart"])

CART_ID_HEADER = "X-Cart-Id"


def _respond(response: Response, cart_out: CartOut) -> CartOut:
    """Ecoa o id do carrinho no header, além do corpo.

    O cliente pode ler de onde preferir; o header também torna o id visível
    em ferramentas de rede sem precisar abrir o payload.
    """
    if cart_out.id:
        response.headers[CART_ID_HEADER] = cart_out.id
    return cart_out


@router.get("", response_model=CartOut)
def get_cart(response: Response, cart: CurrentCart) -> CartOut:
    """Carrinho do visitante.

    Sem header, ou com um id desconhecido, devolve carrinho vazio com
    `id: null` — nunca 404, e **sem criar registro**. Assim um cliente mal
    configurado gera "carrinho sempre vazio", que é diagnosticável, em vez de
    uma enxurrada de pedidos órfãos no banco.
    """
    return _respond(response, cart_service.to_schema(cart))


@router.post("/items", response_model=CartOut, status_code=status.HTTP_201_CREATED)
def add_item(
    db: DbSession,
    response: Response,
    cart: WritableCart,
    payload: AddCartItemIn,
) -> CartOut:
    """Adiciona um produto. Cria o carrinho se o visitante ainda não tem um."""
    updated = cart_service.add_item(db, cart, payload.product_id, payload.quantity)
    return _respond(response, cart_service.to_schema(updated))


@router.patch("/items/{item_id}", response_model=CartOut)
def update_item(
    db: DbSession,
    response: Response,
    cart: ExistingCart,
    item_id: int,
    payload: UpdateCartItemIn,
) -> CartOut:
    """Altera a quantidade. Zero remove o item.

    Só alcança item do próprio carrinho — item de outro visitante devolve 404.
    """
    updated = cart_service.update_item_quantity(db, cart, item_id, payload.quantity)
    return _respond(response, cart_service.to_schema(updated))


@router.delete("/items/{item_id}", response_model=CartOut)
def remove_item(db: DbSession, response: Response, cart: ExistingCart, item_id: int) -> CartOut:
    updated = cart_service.remove_item(db, cart, item_id)
    return _respond(response, cart_service.to_schema(updated))


@router.delete("", response_model=CartOut)
def clear_cart(db: DbSession, response: Response, cart: ExistingCart) -> CartOut:
    updated = cart_service.clear(db, cart)
    return _respond(response, cart_service.to_schema(updated))
