from fastapi import APIRouter, Query
from sqlalchemy import func, select

from app.deps import DbSession
from app.errors import AppError
from app.models import Product
from app.schemas.product import ProductListOut, ProductOut

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=ProductListOut)
def list_products(
    db: DbSession,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> ProductListOut:
    total = db.scalar(select(func.count()).select_from(Product)) or 0
    products = db.scalars(select(Product).order_by(Product.id).limit(limit).offset(offset)).all()
    return ProductListOut(
        items=[ProductOut.model_validate(p) for p in products],
        total=total,
    )


@router.get("/{product_id}", response_model=ProductOut)
def get_product(db: DbSession, product_id: int) -> ProductOut:
    product = db.get(Product, product_id)
    if product is None:
        raise AppError(404, "Produto não encontrado", "PRODUCT_NOT_FOUND")
    return ProductOut.model_validate(product)


@router.get("/{product_id}/related", response_model=list[ProductOut])
def related_products(
    db: DbSession,
    product_id: int,
    limit: int = Query(default=4, ge=1, le=12),
) -> list[ProductOut]:
    """Sugestões para quem está vendo este produto.

    O filtro `Product.id != product_id` é o ponto: sem ele, o primeiro
    "relacionado" é o próprio produto que o cliente já está olhando.
    """
    if db.get(Product, product_id) is None:
        raise AppError(404, "Produto não encontrado", "PRODUCT_NOT_FOUND")

    products = db.scalars(
        select(Product).where(Product.id != product_id).order_by(Product.id).limit(limit)
    ).all()
    return [ProductOut.model_validate(p) for p in products]
