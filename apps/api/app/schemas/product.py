from decimal import Decimal

from pydantic import BaseModel, ConfigDict, computed_field

from app.config import get_settings


def _image_url(image: str | None) -> str | None:
    """Monta a URL pública a partir do nome do arquivo guardado no banco.

    O cliente nunca concatena caminho de imagem: recebe a URL pronta. Isso
    permite mover a mídia para um CDN mudando só `MEDIA_BASE_URL`.
    """
    if not image:
        return None
    return f"{get_settings().media_base_url.rstrip('/')}/{image}"


class ProductSummary(BaseModel):
    """Produto como aparece dentro de um item de carrinho."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    image: str | None = None

    @computed_field  # type: ignore[prop-decorator]
    @property
    def image_url(self) -> str | None:
        return _image_url(self.image)


class ProductOut(ProductSummary):
    """Produto no catálogo e no detalhe."""

    price: Decimal
    short_description: str | None = None
    description: str | None = None


class ProductListOut(BaseModel):
    items: list[ProductOut]
    total: int
