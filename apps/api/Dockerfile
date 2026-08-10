# Estágio usado pelo docker-compose. Traz também as dependências de
# desenvolvimento (pytest, ruff, mypy, pip-audit), para `make test`, `make lint`
# e `make revision` rodarem sem exigir Python instalado na máquina. O código
# vem por bind mount.
FROM python:3.12-slim AS dev

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

RUN useradd --uid 10001 --create-home --shell /usr/sbin/nologin app

WORKDIR /app
# O WORKDIR nasce do root. Ruff e mypy escrevem cache aqui (.ruff_cache,
# .mypy_cache), e sem isto `make lint` falha com permissão negada.
RUN chown app:app /app

COPY requirements-dev.txt .
# O uv sai da imagem depois de instalar: é ferramenta de build, e deixá-lo
# instalado só aumenta a superfície que o `pip-audit` — corretamente — reclama.
RUN pip install --no-cache-dir uv==0.12.2 \
    && uv pip install --system --no-cache -r requirements-dev.txt \
    && pip uninstall --yes uv

COPY --chown=app:app . .

USER 10001
EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health')"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]


# Estágios de produção. O compose não os usa — este projeto roda sempre em
# desenvolvimento. Ficam aqui como o caminho de deploy, caso passe a existir.
FROM python:3.12-slim AS builder

WORKDIR /app

COPY requirements.txt .
# Sem o uninstall, o uv iria junto no COPY de site-packages para o runtime.
RUN pip install --no-cache-dir uv==0.12.2 \
    && uv pip install --system --no-cache -r requirements.txt \
    && pip uninstall --yes uv


FROM python:3.12-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# UID numérico: o Kubernetes precisa dele para validar runAsNonRoot.
RUN useradd --uid 10001 --create-home --shell /usr/sbin/nologin app

WORKDIR /app

# psycopg[binary] embute a libpq, então o runtime dispensa gcc e libpq-dev.
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

COPY --chown=app:app alembic.ini ./
COPY --chown=app:app app/ ./app/
COPY --chown=app:app migrations/ ./migrations/
COPY --chown=app:app static/ ./static/

USER 10001
EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health')"

# Sem migration no entrypoint: ela roda no serviço api-migrate, uma vez só.
# Com várias réplicas, N containers rodando `alembic upgrade head` ao mesmo
# tempo disputam lock.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
