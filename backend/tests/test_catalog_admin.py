from fastapi.testclient import TestClient


def test_create_and_update_family(admin_client: TestClient) -> None:
    response = admin_client.post(
        "/api/admin/familias",
        json={"name": "Familia de Prueba", "description": "Solo para tests", "sort_order": 99},
    )
    assert response.status_code == 201, response.text
    family = response.json()
    assert family["name"] == "Familia de Prueba"
    assert family["slug"] == "familia-de-prueba"
    assert family["product_count"] == 0

    updated = admin_client.put(
        f"/api/admin/familias/{family['id']}",
        json={"name": "Familia Renombrada", "description": "Actualizada", "sort_order": 100},
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "Familia Renombrada"

    public = admin_client.get("/api/familias").json()
    assert any(item["id"] == family["id"] for item in public)


def test_duplicate_family_name_is_rejected(admin_client: TestClient) -> None:
    assert (
        admin_client.post("/api/admin/familias", json={"name": "Familia Duplicada"}).status_code
        == 201
    )
    response = admin_client.post(
        "/api/admin/familias", json={"name": "familia duplicada"}
    )
    assert response.status_code == 400


def test_cannot_delete_family_with_products(admin_client: TestClient) -> None:
    family = admin_client.post(
        "/api/admin/familias", json={"name": "Familia Con Producto"}
    ).json()

    product = admin_client.post(
        "/api/admin/productos",
        json={
            "name": "Producto de familia",
            "sku": "TST-CAT-001",
            "product_type": "contratipo",
            "family_id": family["id"],
            "active": True,
            "presentations": [
                {
                    "volume_ml": 30,
                    "price_cop": 50000,
                    "stock": 1,
                    "min_stock": 0,
                    "active": True,
                }
            ],
        },
    )
    assert product.status_code == 201

    response = admin_client.delete(f"/api/admin/familias/{family['id']}")
    assert response.status_code == 409


def test_delete_empty_family(admin_client: TestClient) -> None:
    family = admin_client.post(
        "/api/admin/familias", json={"name": "Familia Vacía"}
    ).json()
    assert admin_client.delete(f"/api/admin/familias/{family['id']}").status_code == 200
    assert admin_client.delete(f"/api/admin/familias/{family['id']}").status_code == 404


def test_create_update_and_delete_note(admin_client: TestClient) -> None:
    response = admin_client.post("/api/admin/notas", json={"name": "Nota de Prueba"})
    assert response.status_code == 201, response.text
    note = response.json()
    assert note["slug"] == "nota-de-prueba"
    assert note["usage_count"] == 0

    duplicate = admin_client.post("/api/admin/notas", json={"name": "nota de prueba"})
    assert duplicate.status_code == 400

    updated = admin_client.put(
        f"/api/admin/notas/{note['id']}", json={"name": "Nota Renombrada"}
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "Nota Renombrada"

    assert admin_client.delete(f"/api/admin/notas/{note['id']}").status_code == 200
    assert admin_client.delete(f"/api/admin/notas/{note['id']}").status_code == 404


def test_cannot_delete_note_in_use(admin_client: TestClient) -> None:
    note = admin_client.post("/api/admin/notas", json={"name": "Nota En Uso"}).json()

    product = admin_client.post(
        "/api/admin/productos",
        json={
            "name": "Producto con nota",
            "sku": "TST-CAT-002",
            "product_type": "contratipo",
            "active": True,
            "notes": [{"note_id": note["id"], "note_type": "corazon"}],
            "presentations": [
                {
                    "volume_ml": 30,
                    "price_cop": 50000,
                    "stock": 1,
                    "min_stock": 0,
                    "active": True,
                }
            ],
        },
    )
    assert product.status_code == 201

    assert admin_client.delete(f"/api/admin/notas/{note['id']}").status_code == 409


def test_public_notes_only_include_notes_in_use(admin_client: TestClient) -> None:
    orphan = admin_client.post("/api/admin/notas", json={"name": "Nota Huérfana"}).json()
    public = admin_client.get("/api/notas").json()
    assert all(item["id"] != orphan["id"] for item in public)
