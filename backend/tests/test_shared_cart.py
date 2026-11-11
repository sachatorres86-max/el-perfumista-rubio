import base64
import json

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.models import Presentation, Product

CLIENT_PASSWORD = "Cliente2026!"


def _token(pairs: list[list[int]]) -> str:
    payload = json.dumps(pairs, separators=(",", ":")).encode("utf-8")
    return base64.urlsafe_b64encode(payload).decode("ascii").rstrip("=")


def _register_client(client: TestClient, email: str = "cotizacion@correo.com") -> None:
    response = client.post(
        "/api/auth/registro",
        json={"name": "Cliente Cotización", "email": email, "password": CLIENT_PASSWORD},
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


def test_anonymous_shared_cart_hides_prices_and_total(client: TestClient, db_session) -> None:
    presentation = _in_stock_presentation(db_session)

    response = client.get(f"/api/cotizaciones/{_token([[presentation.id, 2]])}")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["viewer_role"] == "anonimo"
    assert body["total_cop"] is None
    assert body["valid"] is True
    assert body["total_units"] == 2
    line = body["items"][0]
    assert line["presentation_id"] == presentation.id
    assert line["quantity"] == 2
    assert line["unit_price_cop"] is None
    assert line["line_total_cop"] is None
    assert "stock" not in line


def test_client_shared_cart_hides_prices_and_total(client: TestClient, db_session) -> None:
    _register_client(client)
    presentation = _in_stock_presentation(db_session)

    response = client.get(f"/api/cotizaciones/{_token([[presentation.id, 1]])}")
    assert response.status_code == 200
    body = response.json()
    assert body["viewer_role"] == "cliente"
    assert body["total_cop"] is None
    assert body["items"][0]["unit_price_cop"] is None


def test_admin_shared_cart_shows_prices_and_total(
    admin_client: TestClient, db_session
) -> None:
    presentation = _in_stock_presentation(db_session)
    quantity = min(2, presentation.stock)

    response = admin_client.get(f"/api/cotizaciones/{_token([[presentation.id, quantity]])}")
    assert response.status_code == 200
    body = response.json()
    assert body["viewer_role"] == "admin"
    line = body["items"][0]
    assert line["unit_price_cop"] == presentation.price_cop
    assert line["line_total_cop"] == presentation.price_cop * quantity
    assert body["total_cop"] == presentation.price_cop * quantity


def test_seller_shared_cart_shows_prices(seller_client: TestClient, db_session) -> None:
    presentation = _in_stock_presentation(db_session)

    response = seller_client.get(f"/api/cotizaciones/{_token([[presentation.id, 1]])}")
    assert response.status_code == 200
    body = response.json()
    assert body["viewer_role"] == "vendedor"
    assert body["items"][0]["unit_price_cop"] == presentation.price_cop
    assert body["total_cop"] == presentation.price_cop


def test_shared_cart_flags_unavailable_and_unknown_items(
    admin_client: TestClient, db_session
) -> None:
    presentation = _in_stock_presentation(db_session)
    presentation.active = False
    db_session.commit()

    response = admin_client.get(
        f"/api/cotizaciones/{_token([[presentation.id, 1], [999999, 1]])}"
    )
    assert response.status_code == 200
    body = response.json()
    assert body["valid"] is False
    assert body["items"][0]["status"] == "no_disponible"
    assert body["unavailable_items"] == [999999]
    assert body["total_cop"] == presentation.price_cop


def test_shared_cart_merges_duplicate_presentations(
    admin_client: TestClient, db_session
) -> None:
    presentation = _in_stock_presentation(db_session)
    assert presentation.stock >= 2

    response = admin_client.get(
        f"/api/cotizaciones/{_token([[presentation.id, 1], [presentation.id, 1]])}"
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body["items"]) == 1
    assert body["items"][0]["quantity"] == 2
    assert body["total_units"] == 2


def test_shared_cart_rejects_invalid_tokens(client: TestClient) -> None:
    for token in ("!!!", "bm8tZXMtZXN0by1h", _token([]), _token([[0, 1]]), _token([[1, 0]])):
        response = client.get(f"/api/cotizaciones/{token}")
        assert response.status_code == 404, token
        assert response.json()["detail"] == "Enlace de cotización inválido o incompleto"
