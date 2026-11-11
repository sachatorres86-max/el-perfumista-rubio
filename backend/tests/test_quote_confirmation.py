from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.models import InventoryMovement, Presentation, Product, Quote
from tests.conftest import ADMIN_EMAIL, ADMIN_PASSWORD, SELLER_EMAIL, SELLER_PASSWORD

CLIENT_PASSWORD = "Cliente2026!"


def _register_client(client: TestClient, email: str = "pedido@correo.com") -> None:
    response = client.post(
        "/api/auth/registro",
        json={"name": "Cliente Pedido", "email": email, "password": CLIENT_PASSWORD},
    )
    assert response.status_code == 201, response.text


def _login_staff(client: TestClient, seller: bool = False) -> None:
    client.post("/api/auth/logout")
    response = client.post(
        "/api/auth/login",
        json={
            "email": SELLER_EMAIL if seller else ADMIN_EMAIL,
            "password": SELLER_PASSWORD if seller else ADMIN_PASSWORD,
        },
    )
    assert response.status_code == 200, response.text


def _presentation_with_stock(db_session, minimum: int = 2) -> tuple[int, int]:
    row = db_session.execute(
        select(Presentation.id, Presentation.stock)
        .join(Product, Presentation.product_id == Product.id)
        .where(
            Product.active.is_(True),
            Presentation.active.is_(True),
            Presentation.stock >= minimum,
        )
        .limit(1)
    ).one()
    return row.id, row.stock


def _stock(db_session, presentation_id: int) -> int:
    db_session.expire_all()
    return db_session.scalar(
        select(Presentation.stock).where(Presentation.id == presentation_id)
    )


def _place_order(client: TestClient, presentation_id: int, quantity: int = 1):
    return client.post(
        "/api/cliente/carrito/pedido",
        json={"items": [{"presentation_id": presentation_id, "quantity": quantity}]},
    )


def test_client_order_creates_pending_quote_without_touching_stock(
    client: TestClient, db_session
) -> None:
    _register_client(client)
    presentation_id, stock = _presentation_with_stock(db_session)

    response = _place_order(client, presentation_id, 2)
    assert response.status_code == 201, response.text
    order = response.json()
    assert order["status"] == "pendiente"
    assert order["total_units"] == 2
    assert order["expires_at"] is not None
    assert "total_cop" not in order
    assert "items" not in order

    assert _stock(db_session, presentation_id) == stock

    db_session.expire_all()
    quote = db_session.scalar(select(Quote))
    assert quote is not None
    assert quote.status.value == "pendiente"
    assert quote.client_id is not None
    assert quote.expires_at is not None
    assert quote.total_units == 2
    assert len(quote.items) == 1
    movements = db_session.scalars(select(InventoryMovement)).all()
    assert all("Pedido #" not in (movement.reason or "") for movement in movements)


def test_staff_sees_pending_orders_first_with_client_and_prices(
    client: TestClient, db_session
) -> None:
    _register_client(client)
    presentation_id, _ = _presentation_with_stock(db_session, minimum=4)
    first = _place_order(client, presentation_id, 1).json()
    second = _place_order(client, presentation_id, 2).json()

    _login_staff(client)
    confirmed = client.post(f"/api/admin/cotizaciones/{second['id']}/confirmar")
    assert confirmed.status_code == 201, confirmed.text

    listing = client.get("/api/admin/cotizaciones")
    assert listing.status_code == 200
    body = listing.json()
    assert body["total"] == 2
    assert [item["id"] for item in body["items"]] == [first["id"], second["id"]]
    pending = body["items"][0]
    assert pending["status"] == "pendiente"
    assert pending["client_name"] == "Cliente Pedido"
    assert pending["client_email"] == "pedido@correo.com"
    assert pending["total_cop"] > 0
    assert pending["expires_at"] is not None
    assert pending["items"][0]["unit_price_cop"] > 0

    pending_only = client.get(
        "/api/admin/cotizaciones", params={"estado": "pendiente"}
    )
    assert pending_only.status_code == 200
    assert pending_only.json()["total"] == 1
    assert pending_only.json()["items"][0]["id"] == first["id"]


def test_confirm_pending_order_discounts_stock_and_audits(
    client: TestClient, db_session
) -> None:
    _register_client(client)
    presentation_id, stock = _presentation_with_stock(db_session)
    order = _place_order(client, presentation_id, 2).json()

    _login_staff(client, seller=True)
    response = client.post(f"/api/admin/cotizaciones/{order['id']}/confirmar")
    assert response.status_code == 201, response.text
    quote = response.json()
    assert quote["status"] == "confirmada"
    assert quote["confirmed_by_name"] == "Vendedor"
    assert quote["client_name"] == "Cliente Pedido"
    assert quote["total_units"] == 2
    assert _stock(db_session, presentation_id) == stock - 2

    db_session.expire_all()
    movements = db_session.scalars(
        select(InventoryMovement).where(
            InventoryMovement.reason == f"Pedido #{order['id']} confirmado"
        )
    ).all()
    assert len(movements) == 1
    assert movements[0].movement_type.value == "salida"
    assert movements[0].quantity == 2

    duplicate = client.post(f"/api/admin/cotizaciones/{order['id']}/confirmar")
    assert duplicate.status_code == 409
    assert _stock(db_session, presentation_id) == stock - 2


def test_cancel_confirmed_order_restores_stock_and_audits(
    client: TestClient, db_session
) -> None:
    _register_client(client)
    presentation_id, stock = _presentation_with_stock(db_session)
    order = _place_order(client, presentation_id, 2).json()

    _login_staff(client)
    quote = client.post(f"/api/admin/cotizaciones/{order['id']}/confirmar").json()

    response = client.post(f"/api/admin/cotizaciones/{quote['id']}/cancelar")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] == "cancelada"
    assert body["cancelled_at"] is not None
    assert body["cancelled_by_name"]
    assert body["cancelled_automatically"] is False
    assert _stock(db_session, presentation_id) == stock

    db_session.expire_all()
    movements = db_session.scalars(
        select(InventoryMovement).where(
            InventoryMovement.reason == f"Cancelación pedido #{quote['id']}"
        )
    ).all()
    assert len(movements) == 1
    assert movements[0].movement_type.value == "entrada"
    assert movements[0].quantity == 2

    again = client.post(f"/api/admin/cotizaciones/{quote['id']}/cancelar")
    assert again.status_code == 409


def test_pending_order_expires_after_48_hours_without_stock_changes(
    client: TestClient, db_session
) -> None:
    _register_client(client)
    presentation_id, stock = _presentation_with_stock(db_session)
    order = _place_order(client, presentation_id, 1).json()

    quote = db_session.scalar(select(Quote).where(Quote.id == order["id"]))
    assert quote is not None
    quote.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    db_session.commit()

    _login_staff(client)
    listing = client.get("/api/admin/cotizaciones", params={"estado": "cancelada"})
    assert listing.status_code == 200
    body = listing.json()
    assert body["total"] == 1
    expired = body["items"][0]
    assert expired["id"] == order["id"]
    assert expired["status"] == "cancelada"
    assert expired["cancelled_automatically"] is True
    assert expired["cancelled_by_name"] is None
    assert expired["expires_at"] is not None
    assert _stock(db_session, presentation_id) == stock

    confirm = client.post(f"/api/admin/cotizaciones/{order['id']}/confirmar")
    assert confirm.status_code == 409
    assert "cancelado" in confirm.json()["detail"].lower()
    assert _stock(db_session, presentation_id) == stock


def test_confirm_rejects_order_when_stock_is_no_longer_enough(
    client: TestClient, db_session
) -> None:
    _register_client(client)
    presentation_id, _ = _presentation_with_stock(db_session, minimum=1)
    order = _place_order(client, presentation_id, 1).json()

    presentation = db_session.get(Presentation, presentation_id)
    assert presentation is not None
    presentation.stock = 0
    db_session.commit()

    _login_staff(client)
    response = client.post(f"/api/admin/cotizaciones/{order['id']}/confirmar")
    assert response.status_code == 409
    assert "solo tiene 0 unidades" in response.json()["detail"]
    assert _stock(db_session, presentation_id) == 0


def test_order_rejects_empty_cart_and_insufficient_stock(
    client: TestClient, db_session
) -> None:
    _register_client(client)

    empty = client.post("/api/cliente/carrito/pedido", json={"items": []})
    assert empty.status_code == 422

    presentation_id, stock = _presentation_with_stock(db_session, minimum=1)
    quantity = min(99, stock + 1)
    response = _place_order(client, presentation_id, quantity)
    assert response.status_code == 409
    assert "solo tiene" in response.json()["detail"]
    db_session.expire_all()
    assert db_session.scalar(select(Quote)) is None


def test_order_permissions(client: TestClient) -> None:
    assert client.get("/api/admin/cotizaciones").status_code == 401
    assert client.post("/api/admin/cotizaciones/1/confirmar").status_code == 401

    _register_client(client)
    assert client.get("/api/admin/cotizaciones").status_code == 403
    assert client.post("/api/admin/cotizaciones/1/confirmar").status_code == 403
