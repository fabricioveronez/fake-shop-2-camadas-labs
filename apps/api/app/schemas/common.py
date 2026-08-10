from pydantic import BaseModel, Field


class ErrorResponse(BaseModel):
    """Formato único de erro da API."""

    detail: str | list[dict[str, object]] = Field(description="Descrição legível do erro")
    code: str = Field(description="Código estável, para o cliente ramificar")

    model_config = {
        "json_schema_extra": {"examples": [{"detail": "Carrinho vazio", "code": "CART_EMPTY"}]}
    }


class HealthResponse(BaseModel):
    status: str = "ok"


class ReadyResponse(BaseModel):
    status: str
    database: str
