"""Autorização de pagamento — gateway simulado.

Este módulo é a fronteira além da qual o número do cartão não passa. Recebe
`PaymentIn`, decide se aprova, e devolve apenas bandeira e últimos quatro
dígitos. Nada mais volta, e nada é gravado.

Trocar isto por um provedor real (Stripe, Pagar.me) não toca no schema: a
tabela `orders` nunca dependeu do dado sensível.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

from app.schemas.checkout import PaymentIn

# PAN de teste que sempre recusa, para exercitar o caminho 402 sem gateway.
DECLINED_TEST_PAN = "4000000000000002"

_BRANDS: list[tuple[str, tuple[str, ...]]] = [
    ("visa", ("4",)),
    ("mastercard", ("51", "52", "53", "54", "55", "2221", "2720")),
    ("amex", ("34", "37")),
    ("elo", ("4011", "4312", "4389", "5041", "5067", "6277", "6362", "6363")),
    ("diners", ("300", "301", "302", "303", "304", "305", "36", "38")),
    ("discover", ("6011", "65")),
]


def detect_brand(pan: str) -> str:
    # Prefixos mais longos primeiro: "4011" (elo) é mais específico que "4" (visa).
    matches = [
        (len(prefix), brand)
        for brand, prefixes in _BRANDS
        for prefix in prefixes
        if pan.startswith(prefix)
    ]
    if not matches:
        return "unknown"
    return max(matches)[1]


@dataclass(frozen=True)
class AuthorizationResult:
    approved: bool
    brand: str
    last4: str
    decline_reason: str | None = None


def authorize(payment: PaymentIn, amount: Decimal) -> AuthorizationResult:
    """Simula a autorização. Nunca retorna nem persiste o PAN ou o CVV."""
    pan = payment.card_number.get_secret_value()
    brand = detect_brand(pan)
    last4 = pan[-4:]

    if pan == DECLINED_TEST_PAN:
        return AuthorizationResult(
            approved=False,
            brand=brand,
            last4=last4,
            decline_reason="Cartão recusado pelo emissor",
        )

    if amount <= 0:
        return AuthorizationResult(
            approved=False,
            brand=brand,
            last4=last4,
            decline_reason="Valor inválido para cobrança",
        )

    return AuthorizationResult(approved=True, brand=brand, last4=last4)
