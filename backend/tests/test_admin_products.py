from io import BytesIO

from fastapi.testclient import TestClient
from PIL import Image


def _families_and_notes(client: TestClient):
    families = client.get("/api/admin/familias").json()
    notes = client.get("/api/admin/notas").json()
    return families, notes


def _payload(name: str = "Fragancia de Prueba", sku: str = "TST-0001", **overrides):
    return {
        "name": name,
        "sku": sku,
        "brand": "El Perfumista Rubio",
        "product_type": "contratipo",
        "family_id": None,
        "concentration": "Eau de parfum",
        "gender": "unisex",
        "short_description": "Producto creado por las pruebas automatizadas.",
        "description": "Descripción de prueba.",
        "active": True,
        "featured": False,
        "notes": [],
        "presentations": [
            {
                "volume_ml": 50,
                "bottle_type": "Vidrio",
                "price_cop": 90000,
                "stock": 5,
                "min_stock": 2,
                "active": True,
            }
        ],
        **overrides,
    }


def test_create_product_with_presentation_and_notes(admin_client: TestClient) -> None:
    families, notes = _families_and_notes(admin_client)
    payload = _payload(
        family_id=families[0]["id"],
        notes=[{"note_id": notes[0]["id"], "note_type": "salida"}],
    )

    response = admin_client.post("/api/admin/productos", json=payload)
    assert response.status_code == 201, response.text
    data = response.json()

    assert data["name"] == payload["name"]
    assert data["sku"] == payload["sku"]
    assert data["total_stock"] == 5
    assert data["price_min"] == 90000
    assert data["price_max"] == 90000
    assert len(data["presentations"]) == 1
    assert data["notes"][0]["note_id"] == notes[0]["id"]

    movements = admin_client.get(
        "/api/admin/movimientos", params={"item_type": "presentacion"}
    ).json()
    assert any(
        movement["reason"] == "Stock inicial"
        and movement["presentation_id"] == data["presentations"][0]["id"]
        for movement in movements["items"]
    )


def test_create_product_generates_sku_when_omitted(admin_client: TestClient) -> None:
    payload = _payload(name="Fragancia Sin SKU", sku=None)
    response = admin_client.post("/api/admin/productos", json=payload)
    assert response.status_code == 201, response.text
    assert response.json()["sku"].startswith("PRD-")


def test_duplicate_sku_is_rejected(admin_client: TestClient) -> None:
    assert admin_client.post("/api/admin/productos", json=_payload()).status_code == 201
    duplicate = admin_client.post(
        "/api/admin/productos", json=_payload(name="Otra fragancia", sku="TST-0001")
    )
    assert duplicate.status_code == 400
    assert "SKU" in duplicate.json()["detail"]


def test_active_product_requires_presentations(admin_client: TestClient) -> None:
    payload = _payload(sku="TST-0002", presentations=[])
    response = admin_client.post("/api/admin/productos", json=payload)
    assert response.status_code == 400
    assert "presentación" in response.json()["detail"].lower()


def test_draft_product_can_have_no_presentations(admin_client: TestClient) -> None:
    payload = _payload(sku="TST-0003", active=False, presentations=[])
    response = admin_client.post("/api/admin/productos", json=payload)
    assert response.status_code == 201
    assert response.json()["active"] is False


def test_invalid_family_and_note_are_rejected(admin_client: TestClient) -> None:
    invalid_family = admin_client.post(
        "/api/admin/productos", json=_payload(sku="TST-0004", family_id=999999)
    )
    assert invalid_family.status_code == 400

    invalid_note = admin_client.post(
        "/api/admin/productos",
        json=_payload(sku="TST-0005", notes=[{"note_id": 999999, "note_type": "fondo"}]),
    )
    assert invalid_note.status_code == 400


def test_update_product_stock_creates_adjustment(admin_client: TestClient) -> None:
    created = admin_client.post("/api/admin/productos", json=_payload(sku="TST-0006")).json()
    presentation = created["presentations"][0]

    payload = _payload(sku="TST-0006", presentations=[
        {
            "id": presentation["id"],
            "volume_ml": presentation["volume_ml"],
            "bottle_type": presentation["bottle_type"],
            "price_cop": 120000,
            "stock": 3,
            "min_stock": presentation["min_stock"],
            "active": True,
        }
    ])

    response = admin_client.put(f"/api/admin/productos/{created['id']}", json=payload)
    assert response.status_code == 200, response.text
    updated = response.json()
    assert updated["total_stock"] == 3
    assert updated["price_min"] == 120000

    movements = admin_client.get(
        "/api/admin/movimientos", params={"item_type": "presentacion"}
    ).json()
    adjustment = [
        movement
        for movement in movements["items"]
        if movement["presentation_id"] == presentation["id"]
        and movement["movement_type"] == "ajuste"
    ]
    assert adjustment
    assert adjustment[0]["resulting_stock"] == 3
    assert "5" in adjustment[0]["reason"] and "3" in adjustment[0]["reason"]


def test_deactivate_product_hides_it_from_public_catalog(admin_client: TestClient) -> None:
    created = admin_client.post("/api/admin/productos", json=_payload(sku="TST-0007")).json()
    slug = created["slug"]

    assert admin_client.get(f"/api/productos/{slug}").status_code == 200

    response = admin_client.delete(f"/api/admin/productos/{created['id']}")
    assert response.status_code == 200

    assert admin_client.get(f"/api/productos/{slug}").status_code == 404

    inactive = admin_client.get("/api/admin/productos", params={"estado": "inactivo"}).json()
    assert any(item["id"] == created["id"] for item in inactive["items"])

    # Re-activate
    activate_resp = admin_client.post(f"/api/admin/productos/{created['id']}/activar")
    assert activate_resp.status_code == 200
    assert admin_client.get(f"/api/productos/{slug}").status_code == 200


def test_admin_listing_filters(admin_client: TestClient) -> None:
    assert admin_client.post("/api/admin/productos", json=_payload(sku="TST-0008")).status_code == 201

    search = admin_client.get("/api/admin/productos", params={"q": "TST-0008"}).json()
    assert search["total"] == 1

    active = admin_client.get("/api/admin/productos", params={"estado": "activo"}).json()
    assert all(item["active"] for item in active["items"])

    low = admin_client.get("/api/admin/productos", params={"estado": "stock_bajo"}).json()
    assert low["total"] >= 1


def test_presentation_options(admin_client: TestClient) -> None:
    created = admin_client.post("/api/admin/productos", json=_payload(sku="TST-0009")).json()
    options = admin_client.get("/api/admin/productos/presentaciones/opciones").json()
    assert any(
        option["product_name"] == created["name"] and option["volume_ml"] == 50
        for option in options
    )


def test_bulk_price_endpoint_removed(admin_client: TestClient) -> None:
    response = admin_client.post("/api/admin/productos/precios/masivo", json={"percentage": 10})
    assert response.status_code == 405


def test_image_upload_and_delete(admin_client: TestClient) -> None:
    created = admin_client.post("/api/admin/productos", json=_payload(sku="TST-0011")).json()

    buffer = BytesIO()
    Image.new("RGB", (40, 40), (6, 182, 212)).save(buffer, format="PNG")
    buffer.seek(0)

    rejected = admin_client.post(
        f"/api/admin/productos/{created['id']}/imagenes",
        files={"file": ("nota.txt", b"hola", "text/plain")},
    )
    assert rejected.status_code == 400

    uploaded = admin_client.post(
        f"/api/admin/productos/{created['id']}/imagenes",
        files={"file": ("producto.png", buffer.getvalue(), "image/png")},
    )
    assert uploaded.status_code == 201, uploaded.text
    image = uploaded.json()
    assert image["path"].startswith("/media/products/")
    assert image["path"].endswith(".webp")

    detail = admin_client.get(f"/api/admin/productos/{created['id']}").json()
    assert len(detail["images"]) == 1

    deleted = admin_client.delete(
        f"/api/admin/productos/{created['id']}/imagenes/{image['id']}"
    )
    assert deleted.status_code == 200

    detail = admin_client.get(f"/api/admin/productos/{created['id']}").json()
    assert detail["images"] == []
