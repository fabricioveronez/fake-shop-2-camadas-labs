from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Order


def test_carrinho_sem_header_vem_vazio_e_nao_cria_registro(client: TestClient, db: Session) -> None:
    response = client.get("/api/cart")

    assert response.status_code == 200
    body = response.json()
    assert body["id"] is None
    assert body["items"] == []

    # A leitura não pode gerar pedido órfão: um cliente mal configurado
    # criaria uma linha por request.
    assert db.scalar(select(func.count()).select_from(Order)) == 0


def test_adicionar_item_cria_o_carrinho_e_devolve_o_id(client: TestClient) -> None:
    response = client.post("/api/cart/items", json={"product_id": 1, "quantity": 2})

    assert response.status_code == 201
    body = response.json()
    assert body["id"]
    assert response.headers["X-Cart-Id"] == body["id"]
    assert body["items"][0]["quantity"] == 2
    assert body["items"][0]["unit_price"] == "1299.00"
    assert body["items"][0]["line_total"] == "2598.00"


def test_totais_incluem_frete(client: TestClient) -> None:
    cart_id, _ = _add(client, product_id=1, quantity=2)
    body = client.get("/api/cart", headers={"X-Cart-Id": cart_id}).json()

    assert body["subtotal"] == "2598.00"
    assert body["shipping"] == "10.00"
    assert body["total"] == "2608.00"
    assert body["item_count"] == 2


def test_carrinho_vazio_nao_cobra_frete(client: TestClient, cart_with_item) -> None:
    cart_id, item_id = cart_with_item
    body = client.delete(f"/api/cart/items/{item_id}", headers={"X-Cart-Id": cart_id}).json()

    assert body["items"] == []
    assert body["shipping"] == "0.00"
    assert body["total"] == "0.00"


def test_adicionar_o_mesmo_produto_soma_a_quantidade(client: TestClient) -> None:
    cart_id, _ = _add(client, product_id=1, quantity=1)
    body = client.post(
        "/api/cart/items",
        json={"product_id": 1, "quantity": 3},
        headers={"X-Cart-Id": cart_id},
    ).json()

    assert len(body["items"]) == 1
    assert body["items"][0]["quantity"] == 4


def test_alterar_quantidade_recalcula(client: TestClient, cart_with_item) -> None:
    cart_id, item_id = cart_with_item
    body = client.patch(
        f"/api/cart/items/{item_id}", json={"quantity": 5}, headers={"X-Cart-Id": cart_id}
    ).json()

    assert body["items"][0]["quantity"] == 5
    assert body["subtotal"] == "6495.00"


def test_quantidade_zero_remove_o_item(client: TestClient, cart_with_item) -> None:
    cart_id, item_id = cart_with_item
    body = client.patch(
        f"/api/cart/items/{item_id}", json={"quantity": 0}, headers={"X-Cart-Id": cart_id}
    ).json()

    assert body["items"] == []


def test_item_de_outro_carrinho_devolve_404(client: TestClient, cart_with_item) -> None:
    """O filtro por dono é o que impede mexer no carrinho alheio."""
    _, item_id = cart_with_item
    other_cart_id, _ = _add(client, product_id=2, quantity=1)

    patch = client.patch(
        f"/api/cart/items/{item_id}",
        json={"quantity": 99},
        headers={"X-Cart-Id": other_cart_id},
    )
    delete = client.delete(f"/api/cart/items/{item_id}", headers={"X-Cart-Id": other_cart_id})

    assert patch.status_code == 404
    assert patch.json()["code"] == "CART_ITEM_NOT_FOUND"
    assert delete.status_code == 404


def test_header_malformado_devolve_400(client: TestClient) -> None:
    response = client.get("/api/cart", headers={"X-Cart-Id": "nao-e-uuid"})

    assert response.status_code == 400
    assert response.json()["code"] == "INVALID_CART_ID"


def test_header_desconhecido_e_tratado_como_ausente(client: TestClient) -> None:
    """Banco recriado ou pedido já fechado não pode virar loop de erro."""
    unknown = "00000000-0000-4000-8000-000000000000"

    read = client.get("/api/cart", headers={"X-Cart-Id": unknown})
    assert read.status_code == 200
    assert read.json()["id"] is None

    write = client.post(
        "/api/cart/items",
        json={"product_id": 1, "quantity": 1},
        headers={"X-Cart-Id": unknown},
    )
    assert write.status_code == 201
    assert write.json()["id"] != unknown


def test_mutar_item_sem_carrinho_devolve_404(client: TestClient) -> None:
    response = client.delete("/api/cart/items/1")

    assert response.status_code == 404
    assert response.json()["code"] == "CART_NOT_FOUND"


def test_adicionar_produto_inexistente_devolve_404(client: TestClient) -> None:
    response = client.post("/api/cart/items", json={"product_id": 9999, "quantity": 1})

    assert response.status_code == 404
    assert response.json()["code"] == "PRODUCT_NOT_FOUND"


def _add(client: TestClient, product_id: int, quantity: int) -> tuple[str, int]:
    body = client.post(
        "/api/cart/items", json={"product_id": product_id, "quantity": quantity}
    ).json()
    return body["id"], body["items"][0]["id"]
