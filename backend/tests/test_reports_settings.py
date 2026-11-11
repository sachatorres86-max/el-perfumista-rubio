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
    response = admin_client.get(
        "/api/admin/reportes/resumen", params={"periodo": "mensual"}
    )
    assert response.status_code == 200
    data = response.json()

    assert data["periodo"] == "mensual"
    assert data["activity"]["movements_total"] >= 1
    assert data["activity"]["quotes_confirmed"] == 0
    assert data["inventory_value_cop"] == data["product_value_cop"] + data["supply_value_cop"]
    assert data["counts"]["low_stock_presentations"] == len(data["low_stock_presentations"])
    assert data["counts"]["out_of_stock_presentations"] == len(data["out_of_stock_presentations"])
    assert data["counts"]["low_stock_supplies"] == len(data["low_stock_supplies"])


def test_reports_summary_requires_period(admin_client: TestClient) -> None:
    assert admin_client.get("/api/admin/reportes/resumen").status_code == 422
    assert admin_client.get("/api/admin/reportes/resumen", params={"periodo": "anual"}).status_code == 422


def test_pdf_export(admin_client: TestClient) -> None:
    response = admin_client.get(
        "/api/admin/reportes/export",
        params={"tipo": "inventario", "periodo": "mensual"},
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert "attachment" in response.headers["content-disposition"]
    assert ".pdf" in response.headers["content-disposition"]
    assert response.content.startswith(b"%PDF-")
    assert len(response.content) > 1000


def test_pdf_export_variants(admin_client: TestClient) -> None:
    for tipo in ("agotados", "stock_bajo", "movimientos", "cotizaciones"):
        response = admin_client.get(
            "/api/admin/reportes/export",
            params={"tipo": tipo, "periodo": "mensual"},
        )
        assert response.status_code == 200, response.text
        assert response.headers["content-type"] == "application/pdf"
        assert response.content.startswith(b"%PDF-")
        assert tipo in response.headers["content-disposition"]
        assert "mensual" in response.headers["content-disposition"]
        assert ".pdf" in response.headers["content-disposition"]

    invalid = admin_client.get(
        "/api/admin/reportes/export",
        params={"tipo": "otro", "periodo": "mensual"},
    )
    assert invalid.status_code == 422
    assert (
        admin_client.get(
            "/api/admin/reportes/export", params={"tipo": "inventario"}
        ).status_code
        == 422
    )


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
    assert (
        client.get(
            "/api/admin/reportes/resumen", params={"periodo": "mensual"}
        ).status_code
        == 401
    )
    assert (
        client.get(
            "/api/admin/reportes/export",
            params={"tipo": "inventario", "periodo": "mensual"},
        ).status_code
        == 401
    )
    assert client.get("/api/admin/dashboard").status_code == 401
