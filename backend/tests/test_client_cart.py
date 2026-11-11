from fastapi.testclient import TestClient
from sqlalchemy import select

from app.models import Presentation, Product

CLIENT_PASSWORD = "Cliente2026!"


def _register_client(client: TestClient, email: str = "carrito@correo.com") -> None:
    response = client.post(
        "/api/auth/registro",
        json={"name": "Cliente Carrito", "email": email, "password": CLIENT_PASSWORD},
    )
    assert response.status_code == 201, response.text


def _in_stock_presentation(db_session) -> Presentation:
    presentation = db_session.scalar(
        select(Presentation)
        .join(Product, Presentation.product_id == Product.id)
        .where(
            Presentation.active.is_(True),
            Presentation.stock > 0,
            Product.active.is_(True),
        )
    )
    assert presentation is not None
    return presentation


def test_cart_validation_requires_client_session(client: TestClient) -> None:
    response = client.post("/api/cliente/carrito/validar", json={"items": []})
    assert response.status_code == 401


def test_staff_cannot_use_client_cart(admin_client: TestClient) -> None:
    response = admin_client.post("/api/cliente/carrito/validar", json={"items": []})
    assert response.status_code == 403


def test_cart_validation_returns_available_line_without_prices(
    client: TestClient, db_session
) -> None:
    _register_client(client)
    presentation = _in_stock_presentation(db_session)

    response = client.post(
        "/api/cliente/carrito/validar",
        json={"items": [{"presentation_id": presentation.id, "quantity": 1}]},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["valid"] is True
    assert body["total_units"] == 1
    assert body["unavailable_items"] == []
    line = body["items"][0]
    assert line["presentation_id"] == presentation.id
    assert line["quantity"] == 1
    assert line["status"] == "disponible"
    assert line["can_increase"] is True
    assert "price_cop" not in line
    assert "stock" not in line


def test_cart_validation_flags_insufficient_quantity(client: TestClient, db_session) -> None:
    _register_client(client)
    presentation = _in_stock_presentation(db_session)
    quantity = min(99, presentation.stock + 1)

    response = client.post(
        "/api/cliente/carrito/validar",
        json={"items": [{"presentation_id": presentation.id, "quantity": quantity}]},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["valid"] is False
    assert body["items"][0]["status"] == "insuficiente"


def test_cart_validation_flags_inactive_and_unknown_items(
    client: TestClient, db_session
) -> None:
    _register_client(client)
    presentation = _in_stock_presentation(db_session)
    presentation.active = False
    db_session.commit()

    response = client.post(
        "/api/cliente/carrito/validar",
        json={
            "items": [
                {"presentation_id": presentation.id, "quantity": 1},
                {"presentation_id": 999999, "quantity": 1},
            ]
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["valid"] is False
    assert body["items"][0]["status"] == "no_disponible"
    assert body["unavailable_items"] == [999999]


def test_cart_validation_merges_duplicate_presentations(
    client: TestClient, db_session
) -> None:
    _register_client(client)
    presentation = _in_stock_presentation(db_session)
    assert presentation.stock >= 2

    response = client.post(
        "/api/cliente/carrito/validar",
        json={
            "items": [
                {"presentation_id": presentation.id, "quantity": 1},
                {"presentation_id": presentation.id, "quantity": 1},
            ]
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body["items"]) == 1
    assert body["items"][0]["quantity"] == 2
    assert body["total_units"] == 2
