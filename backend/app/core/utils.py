import re
import unicodedata

from sqlalchemy import select
from sqlalchemy.orm import Session


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    ascii_value = re.sub(r"[^\w\s-]", "", ascii_value).strip().lower()
    ascii_value = re.sub(r"[-\s]+", "-", ascii_value)
    return ascii_value or "producto"


def unique_slug(db: Session, model, base: str, exclude_id: int | None = None) -> str:
    slug = slugify(base)
    candidate = slug
    counter = 2
    while True:
        conditions = [model.slug == candidate]
        if exclude_id is not None:
            conditions.append(model.id != exclude_id)
        exists = db.scalar(select(model.id).where(*conditions))
        if not exists:
            return candidate
        candidate = f"{slug}-{counter}"
        counter += 1


def next_sku(db: Session, model, prefix: str) -> str:
    counter = 1
    while True:
        sku = f"{prefix}-{counter:04d}"
        if not db.scalar(select(model.id).where(model.sku == sku)):
            return sku
        counter += 1
