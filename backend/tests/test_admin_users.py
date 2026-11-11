from fastapi.testclient import TestClient

from tests.conftest import ADMIN_EMAIL


def _create_user(client: TestClient, **overrides):
    payload = {
        "name": "Usuario de Prueba",
        "email": "usuario@correo.com",
        "password": "Usuario2026!",
        "role": "vendedor",
        "active": True,
    }
    payload.update(overrides)
    return client.post("/api/admin/usuarios", json=payload)


def test_admin_can_create_list_and_login_as_user(admin_client: TestClient) -> None:
    response = _create_user(
        admin_client, name="Vendedor Dos", email="Vendedor2@Correo.com"
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["email"] == "vendedor2@correo.com"
    assert body["role"] == "vendedor"
    assert body["active"] is True
    assert "password" not in body

    listing = admin_client.get("/api/admin/usuarios")
    assert listing.status_code == 200
    emails = {user["email"] for user in listing.json()}
    assert ADMIN_EMAIL in emails
    assert "vendedor2@correo.com" in emails

    login = admin_client.post(
        "/api/auth/login",
        json={"email": "vendedor2@correo.com", "password": "Usuario2026!"},
    )
    assert login.status_code == 200
    assert login.json()["role"] == "vendedor"


def test_create_user_rejects_duplicate_email(admin_client: TestClient) -> None:
    assert _create_user(admin_client).status_code == 201
    duplicate = _create_user(admin_client, email="USUARIO@correo.com")
    assert duplicate.status_code == 409


def test_create_user_validates_fields(admin_client: TestClient) -> None:
    assert _create_user(admin_client, password="corta").status_code == 422
    assert _create_user(admin_client, email="no-es-correo").status_code == 422
    assert _create_user(admin_client, role="superadmin").status_code == 422


def test_create_user_only_allows_vendor_role(admin_client: TestClient) -> None:
    admin = _create_user(
        admin_client, email="otro-admin@correo.com", role="admin"
    )
    assert admin.status_code == 400
    assert "vendedor" in admin.json()["detail"]

    client = _create_user(
        admin_client, email="otro-cliente@correo.com", role="cliente"
    )
    assert client.status_code == 400
    assert "vendedor" in client.json()["detail"]


def test_admin_cannot_deactivate_or_demote_self(admin_client: TestClient) -> None:
    me = admin_client.get("/api/auth/me").json()

    deactivate = admin_client.put(
        f"/api/admin/usuarios/{me['id']}", json={"active": False}
    )
    assert deactivate.status_code == 400

    demote = admin_client.put(
        f"/api/admin/usuarios/{me['id']}", json={"role": "vendedor"}
    )
    assert demote.status_code == 400

    rename = admin_client.put(
        f"/api/admin/usuarios/{me['id']}", json={"name": me["name"]}
    )
    assert rename.status_code == 200


def test_admin_cannot_change_any_user_role(admin_client: TestClient) -> None:
    created = _create_user(admin_client).json()

    for role in ("cliente", "admin"):
        response = admin_client.put(
            f"/api/admin/usuarios/{created['id']}", json={"role": role}
        )
        assert response.status_code == 400, response.text

    unchanged = admin_client.put(
        f"/api/admin/usuarios/{created['id']}", json={"role": "vendedor"}
    )
    assert unchanged.status_code == 200
    assert unchanged.json()["role"] == "vendedor"


def test_admin_cannot_reset_another_users_password(admin_client: TestClient) -> None:
    created = _create_user(admin_client).json()

    response = admin_client.put(
        f"/api/admin/usuarios/{created['id']}",
        json={"password": "NuevaClave2026!"},
    )
    assert response.status_code == 400, response.text
    assert "tu propia cuenta" in response.json()["detail"]

    login = admin_client.post(
        "/api/auth/login",
        json={"email": "usuario@correo.com", "password": "Usuario2026!"},
    )
    assert login.status_code == 200


def test_admin_can_change_own_password(admin_client: TestClient) -> None:
    me = admin_client.get("/api/auth/me").json()

    response = admin_client.put(
        f"/api/admin/usuarios/{me['id']}",
        json={"password": "NuevaClave2026!"},
    )
    assert response.status_code == 200, response.text

    login = admin_client.post(
        "/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": "NuevaClave2026!"},
    )
    assert login.status_code == 200


def test_admin_can_update_other_user_data_and_active(admin_client: TestClient) -> None:
    created = _create_user(admin_client).json()

    updated = admin_client.put(
        f"/api/admin/usuarios/{created['id']}",
        json={
            "name": "Usuario Actualizado",
            "active": False,
        },
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["name"] == "Usuario Actualizado"
    assert updated.json()["active"] is False

    blocked = admin_client.post(
        "/api/auth/login",
        json={"email": "usuario@correo.com", "password": "Usuario2026!"},
    )
    assert blocked.status_code == 401

    reactivated = admin_client.put(
        f"/api/admin/usuarios/{created['id']}", json={"active": True}
    )
    assert reactivated.status_code == 200

    login = admin_client.post(
        "/api/auth/login",
        json={"email": "usuario@correo.com", "password": "Usuario2026!"},
    )
    assert login.status_code == 200
    assert login.json()["role"] == "vendedor"


def test_update_rejects_duplicate_email(admin_client: TestClient) -> None:
    created = _create_user(admin_client).json()
    response = admin_client.put(
        f"/api/admin/usuarios/{created['id']}", json={"email": ADMIN_EMAIL.upper()}
    )
    assert response.status_code == 409


def test_users_endpoint_requires_admin(seller_client: TestClient) -> None:
    assert seller_client.get("/api/admin/usuarios").status_code == 403
    assert (
        seller_client.post(
            "/api/admin/usuarios",
            json={
                "name": "No permitido",
                "email": "nope@correo.com",
                "password": "Password2026!",
                "role": "admin",
            },
        ).status_code
        == 403
    )


def test_users_endpoint_requires_session(client: TestClient) -> None:
    assert client.get("/api/admin/usuarios").status_code == 401
