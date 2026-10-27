from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.constants import DEFAULT_SETTINGS
from app.core.database import get_db
from app.core.deps import require_admin
from app.models import Setting, User
from app.schemas import PublicConfig, SettingsIn

router = APIRouter(prefix="/api/admin/configuracion", tags=["admin · configuración"])


def _merged_settings(db: Session) -> dict[str, str]:
    values = {setting.key: setting.value for setting in db.scalars(select(Setting)).all()}
    return {key: values.get(key, default) for key, default in DEFAULT_SETTINGS.items()}


@router.get("", response_model=PublicConfig)
def get_settings(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> dict[str, str]:
    return _merged_settings(db)


@router.put("", response_model=PublicConfig)
def update_settings(
    payload: SettingsIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> dict[str, str]:
    changes = payload.model_dump(exclude_none=True)
    for key, value in changes.items():
        setting = db.get(Setting, key)
        if setting:
            setting.value = str(value)
        else:
            db.add(Setting(key=key, value=str(value)))
    db.commit()
    return _merged_settings(db)
