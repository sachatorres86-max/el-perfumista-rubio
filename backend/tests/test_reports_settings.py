from fastapi.testclient import TestClient


def test_dashboard_payload(admin_client: TestClient) -> None:
    response = admin_client.get("/api/admin/dashboard")
    assert response.status_code == 200
    data = response.json()

    expected = {
        "products_total",
        "products_active",
        "presentations_count",
        "supplies_count",
        "out_of_stock_products",
        "low_stock_presentations",
        "low_stock_supplies",
        "inventory_value_cop",
        "product_value_cop",
        "supply_value_cop",
        "families",
        "recent_movements",
    }
    assert expected <= set(data)
    assert data["products_total"] >= data["products_active"] >= 1
    assert data["inventory_value_cop"] == data["product_value_cop"] + data["supply_value_cop"]
    assert isinstance(data["families"], list)
    assert len(data["families"]) >= 8


def test_reports_summary(admin_client: TestClient) -> None:
    response = admin_client.get("/api/admin/reportes/resumen")
    assert response.status_code == 200
    data = response.json()

    assert data["inventory_value_cop"] == data["product_value_cop"] + data["supply_value_cop"]
    assert data["counts"]["low_stock_presentations"] == len(data["low_stock_presentations"])
    assert data["counts"]["out_of_stock_presentations"] == len(data["out_of_stock_presentations"])
    assert data["counts"]["low_stock_supplies"] == len(data["low_stock_supplies"])


def test_csv_export(admin_client: TestClient) -> None:
    response = admin_client.get("/api/admin/reportes/export", params={"tipo": "inventario"})
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert "attachment" in response.headers["content-disposition"]
    assert ".csv" in response.headers["content-disposition"]

    text = response.content.decode("utf-8-sig")
    lines = text.strip().splitlines()
    assert lines[0].startswith("Tipo;SKU;Nombre")
    assert any(line.startswith("Producto;") for line in lines)
    assert any(line.startswith("Insumo;") for line in lines)


def test_csv_export_variants(admin_client: TestClient) -> None:
    for tipo in ("agotados", "stock_bajo"):
        response = admin_client.get("/api/admin/reportes/export", params={"tipo": tipo})
        assert response.status_code == 200
        assert tipo in response.headers["content-disposition"]

    invalid = admin_client.get("/api/admin/reportes/export", params={"tipo": "otro"})
    assert invalid.status_code == 422


def test_settings_get_and_update(admin_client: TestClient) -> None:
    current = admin_client.get("/api/admin/configuracion")
    assert current.status_code == 200
    original = current.json()

    updated = admin_client.put(
        "/api/admin/configuracion",
        json={"hours": "9:00 a.m. – 7:00 p.m.", "location_1": "Calle 1, El Poblado"},
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["hours"] == "9:00 a.m. – 7:00 p.m."

    public = admin_client.get("/api/config").json()
    assert public["hours"] == "9:00 a.m. – 7:00 p.m."

    restored = admin_client.put(
        "/api/admin/configuracion", json={"hours": original["hours"]}
    )
    assert restored.status_code == 200
    assert restored.json()["hours"] == original["hours"]


def test_settings_requires_admin(seller_client: TestClient) -> None:
    assert seller_client.get("/api/admin/configuracion").status_code == 403
    assert (
        seller_client.put("/api/admin/configuracion", json={"hours": "x"}).status_code == 403
    )


def test_reports_require_session(client: TestClient) -> None:
    assert client.get("/api/admin/reportes/resumen").status_code == 401
    assert client.get("/api/admin/reportes/export").status_code == 401
    assert client.get("/api/admin/dashboard").status_code == 401
