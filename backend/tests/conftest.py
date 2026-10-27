from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.database import Base, get_db
from app.main import app
from app.routers import auth as auth_router
from app.seed import seed_all

# Nunca tocar la base de datos real durante las pruebas.
settings.auto_init_db = False

TEST_ENGINE = create_engine(
    "sqlite+pysqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    future=True,
)
TestingSession = sessionmaker(
    bind=TEST_ENGINE,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)

ADMIN_EMAIL = settings.admin_email
ADMIN_PASSWORD = settings.admin_password
SELLER_EMAIL = "vendedor@elperfumistarubio.com"
SELLER_PASSWORD = settings.seller_password


@pytest.fixture(autouse=True)
def _database():
    Base.metadata.create_all(bind=TEST_ENGINE)
    with TestingSession() as db:
        seed_all(db)
    auth_router._failed_attempts.clear()
    yield
    Base.metadata.drop_all(bind=TEST_ENGINE)
    auth_router._failed_attempts.clear()


def _override_get_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def client():
    app.dependency_overrides[get_db] = _override_get_db
    # Sin `with`, el lifespan (Postgres/seed) no se ejecuta.
    test_client = TestClient(app)
    try:
        yield test_client
    finally:
        test_client.close()
        app.dependency_overrides.clear()


@pytest.fixture()
def admin_client(client: TestClient) -> TestClient:
    response = client.post(
        "/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    assert response.status_code == 200, response.text
    return client


@pytest.fixture()
def seller_client(client: TestClient) -> TestClient:
    response = client.post(
        "/api/auth/login",
        json={"email": SELLER_EMAIL, "password": SELLER_PASSWORD},
    )
    assert response.status_code == 200, response.text
    return client


@pytest.fixture()
def db_session():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()
