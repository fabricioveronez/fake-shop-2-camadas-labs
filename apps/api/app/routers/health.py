from fastapi import APIRouter
from sqlalchemy import text

from app.deps import DbSession
from app.schemas.common import HealthResponse, ReadyResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    """Liveness: o processo está de pé. Não toca no banco."""
    return HealthResponse()


@router.get("/health/ready", response_model=ReadyResponse)
def ready(db: DbSession) -> ReadyResponse:
    """Readiness: o banco responde."""
    db.execute(text("select 1"))
    return ReadyResponse(status="ok", database="ok")
