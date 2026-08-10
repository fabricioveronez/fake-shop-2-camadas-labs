from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.schemas.checkout import PaymentIn
from app.services import payments


def _payment(**overrides: str) -> PaymentIn:
    data = {
        "card_name": "ANA SILVA",
        "card_number": "4242424242424242",
        "expiry_date": "12/34",
        "cvv": "123",
    }
    data.update(overrides)
    return PaymentIn(**data)  # type: ignore[arg-type]


def test_autoriza_e_devolve_apenas_bandeira_e_ultimos_quatro() -> None:
    result = payments.authorize(_payment(), Decimal("100.00"))

    assert result.approved is True
    assert result.brand == "visa"
    assert result.last4 == "4242"
    # O resultado é a fronteira: nada além disso sai daqui.
    assert not hasattr(result, "card_number")


def test_pan_de_teste_sempre_recusa() -> None:
    result = payments.authorize(_payment(card_number=payments.DECLINED_TEST_PAN), Decimal("100.00"))

    assert result.approved is False
    assert result.decline_reason


@pytest.mark.parametrize(
    ("pan", "expected"),
    [
        ("4242424242424242", "visa"),
        ("5555555555554444", "mastercard"),
        ("378282246310005", "amex"),
        ("6011111111111117", "discover"),
    ],
)
def test_detecta_a_bandeira(pan: str, expected: str) -> None:
    assert payments.detect_brand(pan) == expected


def test_recusa_pan_que_falha_no_luhn() -> None:
    with pytest.raises(ValidationError):
        _payment(card_number="4242424242424241")


def test_recusa_cartao_vencido() -> None:
    with pytest.raises(ValidationError):
        _payment(expiry_date="01/20")


def test_recusa_validade_fora_do_formato() -> None:
    with pytest.raises(ValidationError):
        _payment(expiry_date="2034-12")


def test_recusa_cvv_invalido() -> None:
    with pytest.raises(ValidationError):
        _payment(cvv="12")


def test_pan_e_cvv_nao_aparecem_no_repr() -> None:
    """SecretStr impede o dado vazar em log, traceback ou print de debug."""
    payment = _payment()

    assert "4242424242424242" not in repr(payment)
    assert "123" not in repr(payment.cvv)
