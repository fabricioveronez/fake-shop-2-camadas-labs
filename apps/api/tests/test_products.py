from fastapi.testclient import TestClient


def test_lista_os_nove_produtos_do_seed(client: TestClient) -> None:
    body = client.get("/api/products").json()

    assert body["total"] == 9
    assert len(body["items"]) == 9


def test_produto_traz_url_de_imagem_pronta(client: TestClient) -> None:
    product = client.get("/api/products/1").json()

    assert product["name"] == "Webcam Ultra HD 4K MX Brio"
    assert product["price"] == "1299.00"
    # O cliente nunca concatena caminho: recebe a URL montada.
    assert product["image_url"] == "/static/products/product-1.jpg"


def test_produto_inexistente_devolve_404(client: TestClient) -> None:
    response = client.get("/api/products/9999")

    assert response.status_code == 404
    assert response.json()["code"] == "PRODUCT_NOT_FOUND"


def test_relacionados_nao_incluem_o_proprio_produto(client: TestClient) -> None:
    related = client.get("/api/products/1/related?limit=4").json()

    assert len(related) == 4
    assert 1 not in [product["id"] for product in related]


def test_relacionados_de_produto_inexistente_devolve_404(client: TestClient) -> None:
    assert client.get("/api/products/9999/related").status_code == 404


def test_paginacao(client: TestClient) -> None:
    body = client.get("/api/products?limit=3&offset=3").json()

    assert body["total"] == 9
    assert [p["id"] for p in body["items"]] == [4, 5, 6]
