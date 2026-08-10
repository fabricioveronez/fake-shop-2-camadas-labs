import re
from datetime import date

from pydantic import BaseModel, ConfigDict, EmailStr, Field, SecretStr, field_validator

_EXPIRY_RE = re.compile(r"^(0[1-9]|1[0-2])/(\d{2})$")


class CustomerIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    first_name: str = Field(min_length=1, max_length=50)
    last_name: str = Field(min_length=1, max_length=50)
    email: EmailStr
    mobile: str = Field(min_length=8, max_length=20)


class ShippingAddressIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    address1: str = Field(min_length=1, max_length=255)
    address2: str | None = Field(default=None, max_length=255)
    city: str = Field(min_length=1, max_length=100)
    state: str = Field(min_length=1, max_length=100)
    country: str = Field(default="Brasil", max_length=100)
    zip_code: str = Field(min_length=1, max_length=20)


class PaymentIn(BaseModel):
    """Dados do cartão.

    Write-only: entram, são validados, autorizam o pagamento e são
    descartados. Nada aqui chega ao banco — ver ADR 0004.

    `card_number` e `cvv` são `SecretStr` para não aparecerem em log, `repr`
    ou traceback. A sanitização da resposta 422 (que por padrão ecoa o valor
    rejeitado) está em `app/errors.py`.
    """

    model_config = ConfigDict(extra="forbid")

    card_name: str = Field(min_length=1, max_length=100)
    card_number: SecretStr
    expiry_date: str = Field(description="MM/YY")
    cvv: SecretStr

    @field_validator("card_number")
    @classmethod
    def _validate_pan(cls, value: SecretStr) -> SecretStr:
        digits = re.sub(r"[\s-]", "", value.get_secret_value())
        if not digits.isdigit() or not 12 <= len(digits) <= 19:
            raise ValueError("número de cartão inválido")
        if not _luhn_ok(digits):
            raise ValueError("número de cartão inválido")
        return SecretStr(digits)

    @field_validator("cvv")
    @classmethod
    def _validate_cvv(cls, value: SecretStr) -> SecretStr:
        raw = value.get_secret_value().strip()
        if not raw.isdigit() or not 3 <= len(raw) <= 4:
            raise ValueError("CVV inválido")
        return SecretStr(raw)

    @field_validator("expiry_date")
    @classmethod
    def _validate_expiry(cls, value: str) -> str:
        match = _EXPIRY_RE.match(value.strip())
        if not match:
            raise ValueError("validade deve estar no formato MM/YY")

        month, short_year = int(match.group(1)), int(match.group(2))
        expiry_year = 2000 + short_year
        today = date.today()
        # O cartão vale até o último dia do mês de validade.
        if (expiry_year, month) < (today.year, today.month):
            raise ValueError("cartão vencido")
        return value.strip()


def _luhn_ok(digits: str) -> bool:
    total = 0
    for index, char in enumerate(reversed(digits)):
        digit = int(char)
        if index % 2 == 1:
            digit *= 2
            if digit > 9:
                digit -= 9
        total += digit
    return total % 10 == 0


class CheckoutIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    customer: CustomerIn
    shipping_address: ShippingAddressIn
    payment: PaymentIn
