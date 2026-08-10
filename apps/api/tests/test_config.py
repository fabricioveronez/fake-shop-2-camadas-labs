"""A configuração precisa falhar alto quando o ambiente está incompleto."""

from collections.abc import Iterator

import pytest
from pydantic import ValidationError

from app.config import Settings

COMPLETE = {
    "db_host": "localhost",
    "db_user": "ecommerce",
    "db_password": "s3nh4",
    "db_name": "ecommerce",
}


@pytest.fixture(autouse=True)
def isolated_environment(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    """Isola os testes do ambiente real.

    Sem isto, as variáveis de quem roda os testes (ou um `.env` de
    desenvolvimento na raiz de apps/api) preenchem os campos e os casos de
    "campo ausente" passam por acidente.
    """
    for name in ("DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME", "CORS_ORIGINS"):
        monkeypatch.delenv(name, raising=False)
    yield


def _settings(**overrides: object) -> Settings:
    # _env_file=None ignora o .env: aqui interessa só o que o teste declara.
    return Settings(_env_file=None, **{**COMPLETE, **overrides})  # type: ignore[arg-type]


def test_monta_a_url_de_conexao() -> None:
    assert (
        _settings().database_url == "postgresql+psycopg://ecommerce:s3nh4@localhost:5432/ecommerce"
    )


def test_escapa_caracteres_especiais_na_senha() -> None:
    """Senha com '@' ou '/' quebraria a URL de um jeito que só aparece em prod."""
    url = _settings(db_password="p@ss/w0rd").database_url

    assert "p%40ss%2Fw0rd" in url
    assert "@localhost:5432" in url


@pytest.mark.parametrize("missing", ["db_host", "db_user", "db_password", "db_name"])
def test_campo_ausente_derruba_o_boot(missing: str) -> None:
    values = {key: value for key, value in COMPLETE.items() if key != missing}

    with pytest.raises(ValidationError):
        Settings(_env_file=None, **values)  # type: ignore[arg-type]


@pytest.mark.parametrize("blank", ["db_host", "db_user", "db_password", "db_name"])
def test_campo_vazio_tambem_derruba_o_boot(blank: str) -> None:
    """`DB_PASSWORD=` é variável mal exportada, não uma senha em branco."""
    with pytest.raises(ValidationError):
        _settings(**{blank: ""})


def test_a_senha_nao_aparece_no_repr() -> None:
    assert "s3nh4" not in repr(_settings())


def test_cors_origins_aceita_lista_separada_por_virgula() -> None:
    settings = _settings(cors_origins="http://a.test, http://b.test")

    assert settings.cors_origins == ["http://a.test", "http://b.test"]


def test_cors_origins_vazio_por_padrao() -> None:
    assert _settings().cors_origins == []
