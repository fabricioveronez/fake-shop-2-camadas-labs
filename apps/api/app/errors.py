"""Erros da API e seus handlers."""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


class AppError(Exception):
    """Erro de negócio com status, mensagem e código estável."""

    def __init__(self, status_code: int, detail: str, code: str) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail
        self.code = code


def _payload(detail: object, code: str) -> dict[str, object]:
    return {"detail": detail, "code": code}


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(_payload(exc.detail, exc.code), status_code=exc.status_code)

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        """Responde 422 **sem ecoar o valor rejeitado**.

        O handler padrão do FastAPI inclui o input em `errors()[i]["input"]`.
        Como o checkout recebe número de cartão e CVV, um PAN reprovado no
        Luhn voltaria inteiro no corpo do erro — e daí para o log de erro do
        cliente, para o Sentry e para o print do chamado de suporte.

        Aqui só sobrevivem `loc`, `msg` e `type`. `input` e `ctx` são
        descartados, sempre — não só nas rotas de pagamento, porque a próxima
        rota sensível não vai lembrar de pedir isso.
        """
        safe = [
            {
                "loc": list(error.get("loc", ())),
                "msg": error.get("msg", ""),
                "type": error.get("type", ""),
            }
            for error in exc.errors()
        ]
        return JSONResponse(_payload(safe, "VALIDATION_ERROR"), status_code=422)

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        code = {404: "NOT_FOUND", 405: "METHOD_NOT_ALLOWED"}.get(exc.status_code, "HTTP_ERROR")
        return JSONResponse(_payload(exc.detail, code), status_code=exc.status_code)

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception) -> JSONResponse:
        # Loga o traceback, responde genérico: detalhe de exceção em resposta
        # é vazamento de informação.
        logger.exception(
            "Erro não tratado em %s %s", request.method, request.url.path, exc_info=exc
        )
        return JSONResponse(_payload("Erro interno", "INTERNAL_ERROR"), status_code=500)
