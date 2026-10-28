import time
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import COOKIE_NAME, get_current_user
from app.core.security import create_access_token, verify_password_and_update
from app.models import User
from app.schemas import LoginIn, MessageOut, UserOut

router = APIRouter(prefix="/api/auth", tags=["autenticación"])

_failed_attempts: dict[str, list[float]] = defaultdict(list)
WINDOW_SECONDS = 300
MAX_ATTEMPTS = 6


def _rate_key(request: Request, email: str) -> str:
    host = request.client.host if request.client else "local"
    return f"{host}:{email.lower()}"


def _check_rate(key: str) -> None:
    now = time.time()
    attempts = [timestamp for timestamp in _failed_attempts[key] if now - timestamp < WINDOW_SECONDS]
    _failed_attempts[key] = attempts
    if len(attempts) >= MAX_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
        )


@router.post("/login", response_model=UserOut)
def login(payload: LoginIn, request: Request, response: Response, db: Session = Depends(get_db)) -> User:
    key = _rate_key(request, payload.email)
    _check_rate(key)

    user = db.scalar(select(User).where(func.lower(User.email) == payload.email.lower()))
    if not user or not user.active:
        _failed_attempts[key].append(time.time())
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos",
        )

    password_valid, updated_hash = verify_password_and_update(payload.password, user.password_hash)
    if not password_valid:
        _failed_attempts[key].append(time.time())
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos",
        )
    if updated_hash:
        user.password_hash = updated_hash
        db.commit()

    _failed_attempts.pop(key, None)
    token = create_access_token(user.id, user.role.value)
    max_age = settings.access_token_expire_minutes * 60
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=max_age,
        httponly=True,
        samesite=settings.cookie_samesite,
        secure=settings.cookie_secure,
        path="/",
    )
    return user


@router.post("/logout", response_model=MessageOut)
def logout(response: Response) -> MessageOut:
    response.delete_cookie(COOKIE_NAME, path="/")
    return MessageOut(message="Sesión cerrada")


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> User:
    return user
