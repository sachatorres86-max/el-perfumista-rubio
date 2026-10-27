from fastapi.testclient import TestClient

from tests.conftest import ADMIN_EMAIL, ADMIN_PASSWORD, SELLER_EMAIL, SELLER_PASSWORD


def test_login_sets_cookie_and_returns_user(client: TestClient) -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["email"] == ADMIN_EMAIL
    assert body["role"] == "admin"
    assert "password" not in body
    assert "perfumista_session" in response.cookies


def test_login_is_case_insensitive_for_email(client: TestClient) -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": ADMIN_EMAIL.upper(), "password": ADMIN_PASSWORD},
    )
    assert response.status_code == 200


def test_login_with_wrong_password_fails(client: TestClient) -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": "clave-incorrecta"},
    )
    assert response.status_code == 401
    assert "perfumista_session" not in response.cookies


def test_me_requires_session(client: TestClient) -> None:
    assert client.get("/api/auth/me").status_code == 401


def test_me_returns_current_user(admin_client: TestClient) -> None:
    response = admin_client.get("/api/auth/me")
    assert response.status_code == 200
    assert response.json()["email"] == ADMIN_EMAIL


def test_logout_clears_session(admin_client: TestClient) -> None:
    assert admin_client.get("/api/auth/me").status_code == 200
    response = admin_client.post("/api/auth/logout")
    assert response.status_code == 200
    assert admin_client.get("/api/auth/me").status_code == 401


def test_seller_can_use_staff_endpoints(seller_client: TestClient) -> None:
    assert seller_client.get("/api/admin/dashboard").status_code == 200
    assert seller_client.get("/api/admin/productos").status_code == 200


def test_seller_cannot_use_admin_only_endpoints(seller_client: TestClient) -> None:
    response = seller_client.get("/api/admin/configuracion")
    assert response.status_code == 403

    response = seller_client.post(
        "/api/admin/familias",
        json={"name": "Familia de prueba vendedor"},
    )
    assert response.status_code == 403


def test_seller_credentials_work(client: TestClient) -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": SELLER_EMAIL, "password": SELLER_PASSWORD},
    )
    assert response.status_code == 200
    assert response.json()["role"] == "vendedor"


def test_protected_endpoint_without_session(client: TestClient) -> None:
    assert client.get("/api/admin/productos").status_code == 401
    assert client.get("/api/admin/dashboard").status_code == 401
