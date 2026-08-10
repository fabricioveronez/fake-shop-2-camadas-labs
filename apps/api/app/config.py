from decimal import Decimal
from functools import lru_cache
from typing import Annotated, Literal
from urllib.parse import quote_plus

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    """Configuração da API, lida do ambiente.

    Credenciais **não têm default**: se `DB_USER`, `DB_PASSWORD` ou `DB_NAME`
    não estiverem no ambiente, a aplicação falha no boot com `ValidationError`.
    Um default de senha no código é um segredo versionado — e a falha ruidosa
    no boot é infinitamente melhor que subir apontando para o banco errado.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # --- Banco ---
    # min_length=1 além de "sem default": `DB_PASSWORD=` vazio é quase sempre
    # variável mal exportada, e sem esta restrição a app subiria tentando
    # conectar com senha em branco.
    db_host: str = Field(min_length=1)
    db_port: int = Field(default=5432, ge=1, le=65535)
    db_user: str = Field(min_length=1)
    db_password: SecretStr = Field(min_length=1)
    db_name: str = Field(min_length=1)

    # --- HTTP ---
    # Origens permitidas no CORS. No fluxo padrão o SPA chama /api na mesma
    # origem (nginx em prod, proxy do Vite em dev) e isto fica vazio.
    #
    # NoDecode: sem ele, o pydantic-settings tenta `json.loads` no valor da env
    # antes de chegar ao validator, e `http://a,http://b` estoura.
    cors_origins: Annotated[list[str], NoDecode] = Field(default_factory=list)

    # --- Domínio ---
    media_base_url: str = "/static/products"
    shipping_fee: Decimal = Decimal("10.00")

    environment: Literal["dev", "test", "prod"] = "prod"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        """Aceita `CORS_ORIGINS=http://a,http://b` além de uma lista JSON."""
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @property
    def database_url(self) -> str:
        # quote_plus na senha: sem isso, uma senha com "@" ou "/" quebra a URL
        # de conexão de um jeito que só aparece em produção.
        password = quote_plus(self.db_password.get_secret_value())
        return (
            f"postgresql+psycopg://{quote_plus(self.db_user)}:{password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
