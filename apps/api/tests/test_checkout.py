from fastapi.testclient import TestClient
from sqlalchemy import inspect, select
from sqlalchemy.orm import Session

from app.db import engine
from app.models import Order
from app.services.payments import DECLINED_TEST_PAN


def test_checkout_fecha_o_pedido_e_congela_os_valores(
    client: TestClient, cart_with_item, checkout_payload, db: Session
) -> None:
    cart_id, _ = cart_with_item

    response = client.post("/api/checkout", json=checkout_payload, headers={"X-Cart-Id": cart_id})

    assert response.status_code == 201
    body = response.json()
    assert body["order_number"].isdigit()
    assert len(body["order_number"]) == 6
    assert body["status"] == "paid"
    assert body["total"] == "2608.00"
    assert body["payment"] == {"brand": "visa", "last4": "4242"}

    # O monolito nunca gravava total_price — ficava 0.0 para sempre.
    order = db.scalar(select(Order).where(Order.uuid == cart_id))
    assert order is not None
    assert str(order.total_price) == "2608.00"
    assert order.is_open is False


def test_dados_de_cartao_nao_chegam_ao_banco(
    client: TestClient, cart_with_item, checkout_payload, db: Session
) -> None:
    cart_id, _ = cart_with_item
    client.post("/api/checkout", json=checkout_payload, headers={"X-Cart-Id": cart_id})

    columns = {c["name"] for c in inspect(engine).get_columns("orders")}
    assert not columns & {"card_number", "cvv", "expiry_date", "card_name"}

    order = db.scalar(select(Order).where(Order.uuid == cart_id))
    assert order is not None
    assert order.card_last4 == "4242"
    assert order.card_brand == "visa"


def test_resposta_422_nao_ecoa_o_numero_do_cartao(
    client: TestClient, cart_with_item, checkout_payload
) -> None:
    """O handler padrão do FastAPI devolveria o PAN no campo `input` do erro."""
    cart_id, _ = cart_with_item
    pan = "4242424242424241"  # falha no Luhn
    checkout_payload["payment"]["card_number"] = pan

    response = client.post("/api/checkout", json=checkout_payload, headers={"X-Cart-Id": cart_id})

    assert response.status_code == 422
    assert pan not in response.text
    assert checkout_payload["payment"]["cvv"] not in response.text


def test_cartao_recusado_devolve_402(client: TestClient, cart_with_item, checkout_payload) -> None:
    cart_id, _ = cart_with_item
    checkout_payload["payment"]["card_number"] = DECLINED_TEST_PAN

    response = client.post("/api/checkout", json=checkout_payload, headers={"X-Cart-Id": cart_id})

    assert response.status_code == 402
    assert response.json()["code"] == "PAYMENT_DECLINED"


def test_carrinho_vazio_devolve_409(client: TestClient, checkout_payload) -> None:
    cart_id = client.post("/api/cart/items", json={"product_id": 1, "quantity": 1}).json()["id"]
    client.delete("/api/cart", headers={"X-Cart-Id": cart_id})

    response = client.post("/api/checkout", json=checkout_payload, headers={"X-Cart-Id": cart_id})

    assert response.status_code == 409
    assert response.json()["code"] == "CART_EMPTY"


def test_cartao_vencido_e_recusado(client: TestClient, cart_with_item, checkout_payload) -> None:
    cart_id, _ = cart_with_item
    checkout_payload["payment"]["expiry_date"] = "01/20"

    response = client.post("/api/checkout", json=checkout_payload, headers={"X-Cart-Id": cart_id})

    assert response.status_code == 422


def test_carrinho_fica_vazio_depois_do_pedido(
    client: TestClient, cart_with_item, checkout_payload
) -> None:
    cart_id, _ = cart_with_item
    client.post("/api/checkout", json=checkout_payload, headers={"X-Cart-Id": cart_id})

    body = client.get("/api/cart", headers={"X-Cart-Id": cart_id}).json()

    assert body["id"] is None
    assert body["items"] == []


def test_cada_visitante_fecha_o_proprio_carrinho(client: TestClient, checkout_payload) -> None:
    """No monolito, o checkout pegava o pedido aberto mais antigo do banco."""
    alice = client.post("/api/cart/items", json={"product_id": 1, "quantity": 1}).json()["id"]
    bob = client.post("/api/cart/items", json={"product_id": 4, "quantity": 2}).json()["id"]

    bob_order = client.post(
        "/api/checkout", json=checkout_payload, headers={"X-Cart-Id": bob}
    ).json()

    assert [item["product_id"] for item in bob_order["items"]] == [4]

    # O carrinho da Alice segue intacto.
    alice_cart = client.get("/api/cart", headers={"X-Cart-Id": alice}).json()
    assert [item["product"]["id"] for item in alice_cart["items"]] == [1]
