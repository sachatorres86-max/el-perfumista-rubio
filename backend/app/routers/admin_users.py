from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_admin
from app.core.security import hash_password
from app.models import Role, User
from app.schemas import AdminUserCreateIn, AdminUserOut, AdminUserUpdateIn

router = APIRouter(prefix="/api/admin/usuarios", tags=["admin · usuarios"])


def _email_in_use(db: Session, email: str, exclude_id: int | None = None) -> bool:
    query = select(User.id).where(func.lower(User.email) == email.lower())
    if exclude_id is not None:
        query = query.where(User.id != exclude_id)
    return db.scalar(query) is not None


@router.get("", response_model=list[AdminUserOut])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[User]:
    return list(db.scalars(select(User).order_by(User.name, User.id)).all())


@router.post("", response_model=AdminUserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: AdminUserCreateIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> User:
    if payload.role != Role.vendedor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se pueden crear usuarios con rol de vendedor",
        )

    email = payload.email.lower().strip()
    if _email_in_use(db, email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una cuenta con este correo electrónico",
        )

    user = User(
        name=payload.name.strip(),
        email=email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        active=payload.active,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una cuenta con este correo electrónico",
        )
    db.refresh(user)
    return user


@router.put("/{user_id}", response_model=AdminUserOut)
def update_user(
    user_id: int,
    payload: AdminUserUpdateIn,
    db: Session = Depends(get_db),
    current: User = Depends(require_admin),
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    data = payload.model_dump(exclude_unset=True)

    if user.id == current.id:
        if data.get("active") is False:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No puedes desactivar tu propia cuenta",
            )

    if "role" in data and data["role"] != user.role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El rol de un usuario no se puede cambiar desde esta vista",
        )

    if data.get("password") and user.id != current.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo puedes cambiar la contraseña de tu propia cuenta",
        )

    if "email" in data and data["email"] is not None:
        email = str(data["email"]).lower().strip()
        if _email_in_use(db, email, exclude_id=user.id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya existe una cuenta con este correo electrónico",
            )
        user.email = email

    if "name" in data and data["name"] is not None:
        user.name = data["name"].strip()
    if "role" in data and data["role"] is not None:
        user.role = data["role"]
    if "active" in data and data["active"] is not None:
        user.active = data["active"]
    if data.get("password"):
        user.password_hash = hash_password(data["password"])

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una cuenta con este correo electrónico",
        )
    db.refresh(user)
    return user
