import json

from fastapi.testclient import TestClient


def test_health(client: TestClient) -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_public_config_has_business_data(client: TestClient) -> None:
    response = client.get("/api/config")
    assert response.status_code == 200
    data = response.json()
    assert data["business_name"] == "El Perfumista Rubio"
    assert data["whatsapp_primary"] == "+584126402721"
    assert data["whatsapp_secondary"] == "+584126402175"
    assert "9:00" in data["hours"]
    assert data["location_1"] == "Calle 1, El Poblado"
    assert data["location_2"] == "Centro – San Martín"


def test_families_and_notes(client: TestClient) -> None:
    families = client.get("/api/familias")
    assert families.status_code == 200
    assert len(families.json()) >= 8
    assert all({"id", "name", "slug", "product_count"} <= set(item) for item in families.json())

    notes = client.get("/api/notas")
    assert notes.status_code == 200
    assert len(notes.json()) > 0


def test_products_pagination(client: TestClient) -> None:
    response = client.get("/api/productos", params={"page": 1, "page_size": 5})
    assert response.status_code == 200
    data = response.json()
    assert data["page"] == 1
    assert data["page_size"] == 5
    assert data["total"] >= 1
    assert len(data["items"]) <= 5
    assert data["pages"] >= 1


def test_public_payload_never_exposes_prices(client: TestClient) -> None:
    listing = client.get("/api/productos", params={"page_size": 48})
    assert listing.status_code == 200
    assert "price" not in json.dumps(listing.json()).lower()

    slug = listing.json()["items"][0]["slug"]
    detail = client.get(f"/api/productos/{slug}")
    assert detail.status_code == 200
    body = detail.json()
    assert "price" not in json.dumps(body).lower()
    for presentation in body["presentations"]:
        assert "available" in presentation
        assert "stock" not in presentation


def test_product_detail_structure(client: TestClient) -> None:
    slug = client.get("/api/productos").json()["items"][0]["slug"]
    response = client.get(f"/api/productos/{slug}")
    assert response.status_code == 200
    data = response.json()
    assert data["slug"] == slug
    assert set(data["notes"]) == {"salida", "corazon", "fondo"}
    assert isinstance(data["images"], list)
    assert isinstance(data["related"], list)
    assert "available" in data


def test_unknown_product_returns_404(client: TestClient) -> None:
    assert client.get("/api/productos/no-existe-esta-fragancia").status_code == 404


def test_search_and_filters(client: TestClient) -> None:
    all_products = client.get("/api/productos", params={"page_size": 48}).json()["items"]
    assert all_products
    target = all_products[0]

    found = client.get("/api/productos", params={"q": target["name"][:5]})
    assert found.status_code == 200
    assert found.json()["total"] >= 1

    disponible = client.get("/api/productos", params={"disponible": "true"}).json()
    assert all(item["available"] for item in disponible["items"])

    agotado = client.get("/api/productos", params={"disponible": "false"}).json()
    assert all(not item["available"] for item in agotado["items"])

    if target["family"]:
        by_family = client.get(
            "/api/productos", params={"familia": target["family"]["slug"], "page_size": 48}
        ).json()
        assert by_family["total"] >= 1
        assert all(
            item["family"] and item["family"]["slug"] == target["family"]["slug"]
            for item in by_family["items"]
        )


def test_featured_filter(client: TestClient) -> None:
    response = client.get("/api/productos", params={"destacado": "true", "page_size": 48})
    assert response.status_code == 200
    assert all(item["featured"] for item in response.json()["items"])
