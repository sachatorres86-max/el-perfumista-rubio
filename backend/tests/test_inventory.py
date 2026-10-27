from fastapi.testclient import TestClient


def _supply_payload(**overrides):
    return {
        "name": "Esencia de prueba",
        "sku": "TST-INS-001",
        "category": "esencia",
        "unit": "ml",
        "stock": 10,
        "min_stock": 3,
        "unit_cost_cop": 500,
        "active": True,
        "notes": "Insumo de prueba",
        **overrides,
    }


def _first_presentation(client: TestClient) -> dict:
    options = client.get("/api/admin/productos/presentaciones/opciones").json()
    assert options
    return options[0]


def test_create_supply_registers_initial_stock(admin_client: TestClient) -> None:
    response = admin_client.post("/api/admin/insumos", json=_supply_payload())
    assert response.status_code == 201, response.text
    supply = response.json()
    assert supply["stock"] == 10
    assert supply["low_stock"] is False

    movements = admin_client.get("/api/admin/movimientos", params={"item_type": "insumo"}).json()
    assert any(
        movement["supply_id"] == supply["id"]
        and movement["reason"] == "Stock inicial"
        and movement["resulting_stock"] == 10
        for movement in movements["items"]
    )


def test_duplicate_supply_sku_is_rejected(admin_client: TestClient) -> None:
    assert admin_client.post("/api/admin/insumos", json=_supply_payload()).status_code == 201
    duplicate = admin_client.post(
        "/api/admin/insumos", json=_supply_payload(name="Otra esencia")
    )
    assert duplicate.status_code == 400


def test_update_supply(admin_client: TestClient) -> None:
    supply = admin_client.post(
        "/api/admin/insumos", json=_supply_payload(sku="TST-INS-002")
    ).json()

    response = admin_client.put(
        f"/api/admin/insumos/{supply['id']}",
        json={
            "name": "Esencia actualizada",
            "category": "fijador",
            "unit": "gr",
            "min_stock": 20,
            "unit_cost_cop": 900,
            "active": True,
            "notes": "Actualizado",
        },
    )
    assert response.status_code == 200, response.text
    updated = response.json()
    assert updated["name"] == "Esencia actualizada"
    assert updated["category"] == "fijador"
    assert updated["unit"] == "gr"
    assert updated["low_stock"] is True


def test_supply_movements(admin_client: TestClient) -> None:
    supply = admin_client.post(
        "/api/admin/insumos", json=_supply_payload(sku="TST-INS-003", stock=10)
    ).json()

    entry = admin_client.post(
        "/api/admin/movimientos",
        json={
            "item_type": "insumo",
            "supply_id": supply["id"],
            "movement_type": "entrada",
            "quantity": 5,
            "reason": "Compra",
        },
    )
    assert entry.status_code == 201, entry.text
    assert entry.json()["resulting_stock"] == 15

    exit_ = admin_client.post(
        "/api/admin/movimientos",
        json={
            "item_type": "insumo",
            "supply_id": supply["id"],
            "movement_type": "salida",
            "quantity": 4,
            "reason": "Producción",
        },
    )
    assert exit_.status_code == 201
    assert exit_.json()["resulting_stock"] == 11

    adjustment = admin_client.post(
        "/api/admin/movimientos",
        json={
            "item_type": "insumo",
            "supply_id": supply["id"],
            "movement_type": "ajuste",
            "quantity": 7,
            "reason": "Conteo físico",
        },
    )
    assert adjustment.status_code == 201
    assert adjustment.json()["resulting_stock"] == 7

    refreshed = admin_client.get("/api/admin/insumos", params={"q": "TST-INS-003"}).json()
    assert refreshed[0]["stock"] == 7


def test_supply_exit_cannot_exceed_stock(admin_client: TestClient) -> None:
    supply = admin_client.post(
        "/api/admin/insumos", json=_supply_payload(sku="TST-INS-004", stock=2)
    ).json()

    response = admin_client.post(
        "/api/admin/movimientos",
        json={
            "item_type": "insumo",
            "supply_id": supply["id"],
            "movement_type": "salida",
            "quantity": 10,
        },
    )
    assert response.status_code == 400
    assert "insuficiente" in response.json()["detail"].lower()


def test_zero_quantity_is_rejected(admin_client: TestClient) -> None:
    supply = admin_client.post(
        "/api/admin/insumos", json=_supply_payload(sku="TST-INS-005")
    ).json()
    response = admin_client.post(
        "/api/admin/movimientos",
        json={
            "item_type": "insumo",
            "supply_id": supply["id"],
            "movement_type": "entrada",
            "quantity": 0,
        },
    )
    assert response.status_code == 400


def test_presentation_movements(admin_client: TestClient) -> None:
    presentation = _first_presentation(admin_client)
    starting_stock = presentation["stock"]

    entry = admin_client.post(
        "/api/admin/movimientos",
        json={
            "item_type": "presentacion",
            "presentation_id": presentation["id"],
            "movement_type": "entrada",
            "quantity": 2,
        },
    )
    assert entry.status_code == 201
    assert entry.json()["resulting_stock"] == starting_stock + 2

    adjustment = admin_client.post(
        "/api/admin/movimientos",
        json={
            "item_type": "presentacion",
            "presentation_id": presentation["id"],
            "movement_type": "ajuste",
            "quantity": 1,
        },
    )
    assert adjustment.status_code == 201
    assert adjustment.json()["resulting_stock"] == 1


def test_movement_requires_item_id(admin_client: TestClient) -> None:
    assert (
        admin_client.post(
            "/api/admin/movimientos",
            json={"item_type": "insumo", "movement_type": "entrada", "quantity": 1},
        ).status_code
        == 400
    )
    assert (
        admin_client.post(
            "/api/admin/movimientos",
            json={"item_type": "presentacion", "movement_type": "entrada", "quantity": 1},
        ).status_code
        == 400
    )


def test_movement_filters_and_pagination(admin_client: TestClient) -> None:
    movements = admin_client.get(
        "/api/admin/movimientos", params={"movement_type": "entrada", "page_size": 10}
    ).json()
    assert movements["page_size"] == 10
    assert all(item["movement_type"] == "entrada" for item in movements["items"])

    supplies = admin_client.get(
        "/api/admin/movimientos", params={"item_type": "insumo", "page_size": 10}
    ).json()
    assert all(item["item_type"] == "insumo" for item in supplies["items"])


def test_low_stock_supply_filter(admin_client: TestClient) -> None:
    admin_client.post(
        "/api/admin/insumos",
        json=_supply_payload(sku="TST-INS-006", stock=1, min_stock=5),
    )
    low = admin_client.get("/api/admin/insumos", params={"stock_bajo": "true"}).json()
    assert low
    assert all(item["stock"] <= item["min_stock"] for item in low)


def test_deactivate_supply(admin_client: TestClient) -> None:
    supply = admin_client.post(
        "/api/admin/insumos", json=_supply_payload(sku="TST-INS-007")
    ).json()
    assert admin_client.delete(f"/api/admin/insumos/{supply['id']}").status_code == 200

    inactive = admin_client.get("/api/admin/insumos", params={"activo": "false"}).json()
    assert any(item["id"] == supply["id"] and item["active"] is False for item in inactive)
