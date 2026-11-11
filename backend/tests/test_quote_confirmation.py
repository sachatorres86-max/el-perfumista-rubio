from fastapi.testclient import TestClient
from sqlalchemy import select

from app.models import InventoryMovement, Presentation, Product, Quote
from app.services.cart_token import encode_cart_token


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


def test_confirm_quote_discounts_stock_and_lists_it(
    admin_client: TestClient, db_session
) -> None:
    presentation_id, stock = _presentation_with_stock(db_session)
    token = encode_cart_token([(presentation_id, 2)])

    response = admin_client.post(
        "/api/admin/cotizaciones/confirmar", json={"token": token}
    )
    assert response.status_code == 201, response.text
    quote = response.json()
    assert quote["status"] == "confirmada"
    assert quote["total_units"] == 2
    assert quote["confirmed_by_name"]
    assert len(quote["items"]) == 1
    assert quote["items"][0]["presentation_id"] == presentation_id
    assert quote["items"][0]["quantity"] == 2

    assert _stock(db_session, presentation_id) == stock - 2

    db_session.expire_all()
    movements = db_session.scalars(
        select(InventoryMovement).where(
            InventoryMovement.reason == f"Cotización #{quote['id']} confirmada"
        )
    ).all()
    assert len(movements) == 1
    assert movements[0].movement_type.value == "salida"
    assert movements[0].quantity == 2

    listing = admin_client.get("/api/admin/cotizaciones")
    assert listing.status_code == 200
    body = listing.json()
    assert body["total"] == 1
    assert body["items"][0]["id"] == quote["id"]

    filtered = admin_client.get(
        "/api/admin/cotizaciones", params={"estado": "cancelada"}
    )
    assert filtered.json()["total"] == 0


def test_cancel_quote_restores_stock_and_audits(
    admin_client: TestClient, db_session
) -> None:
    presentation_id, stock = _presentation_with_stock(db_session)
    token = encode_cart_token([(presentation_id, 2)])
    quote = admin_client.post(
        "/api/admin/cotizaciones/confirmar", json={"token": token}
    ).json()

    response = admin_client.post(f"/api/admin/cotizaciones/{quote['id']}/cancelar")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] == "cancelada"
    assert body["cancelled_at"] is not None
    assert body["cancelled_by_name"]
    assert _stock(db_session, presentation_id) == stock

    db_session.expire_all()
    movements = db_session.scalars(
        select(InventoryMovement).where(
            InventoryMovement.reason == f"Cancelación cotización #{quote['id']}"
        )
    ).all()
    assert len(movements) == 1
    assert movements[0].movement_type.value == "entrada"
    assert movements[0].quantity == 2

    again = admin_client.post(f"/api/admin/cotizaciones/{quote['id']}/cancelar")
    assert again.status_code == 409


def test_quote_cannot_be_confirmed_twice_but_can_after_cancel(
    admin_client: TestClient, db_session
) -> None:
    presentation_id, _ = _presentation_with_stock(db_session)
    token = encode_cart_token([(presentation_id, 1)])

    first = admin_client.post(
        "/api/admin/cotizaciones/confirmar", json={"token": token}
    )
    assert first.status_code == 201
    quote_id = first.json()["id"]

    duplicate = admin_client.post(
        "/api/admin/cotizaciones/confirmar", json={"token": token}
    )
    assert duplicate.status_code == 409

    assert (
        admin_client.post(f"/api/admin/cotizaciones/{quote_id}/cancelar").status_code
        == 200
    )
    retry = admin_client.post(
        "/api/admin/cotizaciones/confirmar", json={"token": token}
    )
    assert retry.status_code == 201
    assert retry.json()["id"] != quote_id

    db_session.expire_all()
    assert len(db_session.scalars(select(Quote)).all()) == 2


def test_confirm_rejects_invalid_token_and_insufficient_stock(
    admin_client: TestClient, db_session
) -> None:
    invalid = admin_client.post(
        "/api/admin/cotizaciones/confirmar", json={"token": "no-es-un-token"}
    )
    assert invalid.status_code == 404

    presentation_id, stock = _presentation_with_stock(db_session, minimum=1)
    token = encode_cart_token([(presentation_id, 99 if stock >= 99 else stock + 1)])
    response = admin_client.post(
        "/api/admin/cotizaciones/confirmar", json={"token": token}
    )
    assert response.status_code == 409
    assert "solo tiene" in response.json()["detail"]
    assert _stock(db_session, presentation_id) == stock


def test_shared_cart_status_reports_confirmation(
    admin_client: TestClient, client: TestClient, db_session
) -> None:
    presentation_id, _ = _presentation_with_stock(db_session)
    token = encode_cart_token([(presentation_id, 1)])

    pending = client.get(f"/api/cotizaciones/{token}/estado")
    assert pending.status_code == 200
    assert pending.json() == {
        "confirmada": False,
        "estado": None,
        "quote_id": None,
    }

    quote = admin_client.post(
        "/api/admin/cotizaciones/confirmar", json={"token": token}
    ).json()
    confirmed = client.get(f"/api/cotizaciones/{token}/estado")
    assert confirmed.status_code == 200
    assert confirmed.json() == {
        "confirmada": True,
        "estado": "confirmada",
        "quote_id": quote["id"],
    }

    admin_client.post(f"/api/admin/cotizaciones/{quote['id']}/cancelar")
    cancelled = client.get(f"/api/cotizaciones/{token}/estado")
    assert cancelled.json() == {
        "confirmada": False,
        "estado": "cancelada",
        "quote_id": quote["id"],
    }

    assert client.get("/api/cotizaciones/no-es-un-token/estado").status_code == 404


def test_anonymous_cannot_manage_quotes(client: TestClient) -> None:
    assert client.get("/api/admin/cotizaciones").status_code == 401
    assert client.post(
        "/api/admin/cotizaciones/confirmar", json={"token": "abc"}
    ).status_code == 401


def test_seller_can_confirm_and_list_quotes(
    seller_client: TestClient, db_session
) -> None:
    presentation_id, _ = _presentation_with_stock(db_session)
    token = encode_cart_token([(presentation_id, 1)])

    response = seller_client.post(
        "/api/admin/cotizaciones/confirmar", json={"token": token}
    )
    assert response.status_code == 201, response.text
    assert seller_client.get("/api/admin/cotizaciones").status_code == 200


def test_client_role_cannot_manage_quotes(client: TestClient) -> None:
    assert (
        client.post(
            "/api/auth/registro",
            json={
                "name": "Cliente Cotización",
                "email": "cotizacion@correo.com",
                "password": "Cliente2026!",
            },
        ).status_code
        == 201
    )

    assert client.get("/api/admin/cotizaciones").status_code == 403
    assert (
        client.post(
            "/api/admin/cotizaciones/confirmar", json={"token": "abc"}
        ).status_code
        == 403
    )
