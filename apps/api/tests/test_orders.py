from fastapi.testclient import TestClient


def test_consulta_pedido_por_uuid(client: TestClient, cart_with_item, checkout_payload) -> None:
    cart_id, _ = cart_with_item
    created = client.post(
        "/api/checkout", json=checkout_payload, headers={"X-Cart-Id": cart_id}
    ).json()

    body = client.get(f"/api/orders/{created['order_uuid']}").json()

    assert body["order_number"] == created["order_number"]
    assert body["customer_name"] == "Ana Silva"
    assert body["items"][0]["product_name"] == "Webcam Ultra HD 4K MX Brio"
    assert body["total"] == "2608.00"


def test_pedido_nao_expoe_dado_de_cartao(
    client: TestClient, cart_with_item, checkout_payload
) -> None:
    cart_id, _ = cart_with_item
    created = client.post(
        "/api/checkout", json=checkout_payload, headers={"X-Cart-Id": cart_id}
    ).json()

    response = client.get(f"/api/orders/{created['order_uuid']}")

    assert checkout_payload["payment"]["card_number"] not in response.text
    assert response.json()["payment"] == {"brand": "visa", "last4": "4242"}


def test_uuid_inexistente_devolve_404(client: TestClient) -> None:
    response = client.get("/api/orders/00000000-0000-4000-8000-000000000000")

    assert response.status_code == 404
    assert response.json()["code"] == "ORDER_NOT_FOUND"


def test_identificador_malformado_devolve_404(client: TestClient) -> None:
    """Não vale tentar adivinhar pedido com número de 6 dígitos."""
    assert client.get("/api/orders/483920").status_code == 404


def test_carrinho_aberto_nao_e_consultavel_como_pedido(client: TestClient, cart_with_item) -> None:
    cart_id, _ = cart_with_item

    assert client.get(f"/api/orders/{cart_id}").status_code == 404
