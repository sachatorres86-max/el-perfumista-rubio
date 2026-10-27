import math
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.constants import DEFAULT_SETTINGS
from app.core.database import get_db
from app.models import Note, OlfactoryFamily, Presentation, Product, ProductNote, Setting
from app.schemas import (
    FamilyOut,
    NoteOut,
    PaginatedProducts,
    ProductDetail,
    ProductListItem,
    PublicConfig,
)
from app.services.serializers import serialize_detail, serialize_list_item

router = APIRouter(prefix="/api", tags=["catálogo"])


def _product_options():
    return (
        selectinload(Product.family),
        selectinload(Product.presentations),
        selectinload(Product.images),
    )


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/config", response_model=PublicConfig)
def get_public_config(db: Session = Depends(get_db)) -> dict[str, str]:
    values = {setting.key: setting.value for setting in db.scalars(select(Setting)).all()}
    return {key: values.get(key, default) for key, default in DEFAULT_SETTINGS.items()}


@router.get("/familias", response_model=list[FamilyOut])
def list_families(db: Session = Depends(get_db)) -> list[dict]:
    rows = db.execute(
        select(OlfactoryFamily, func.count(Product.id))
        .outerjoin(
            Product,
            and_(Product.family_id == OlfactoryFamily.id, Product.active.is_(True)),
        )
        .group_by(OlfactoryFamily.id)
        .order_by(OlfactoryFamily.sort_order, OlfactoryFamily.name)
    ).all()
    return [
        {
            "id": family.id,
            "name": family.name,
            "slug": family.slug,
            "description": family.description,
            "product_count": count,
        }
        for family, count in rows
    ]


@router.get("/notas", response_model=list[NoteOut])
def list_notes(db: Session = Depends(get_db)) -> list[Note]:
    return list(
        db.scalars(
            select(Note)
            .where(
                Note.product_links.any(
                    ProductNote.product.has(Product.active.is_(True))
                )
            )
            .order_by(Note.name)
        ).all()
    )


@router.get("/productos", response_model=PaginatedProducts)
def list_products(
    q: str | None = Query(default=None, max_length=120),
    familia: str | None = Query(default=None, max_length=100),
    tipo: str | None = Query(default=None, max_length=40),
    nota: str | None = Query(default=None, max_length=100),
    disponible: bool | None = Query(default=None),
    destacado: bool | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=48),
    sort: Literal["recientes", "nombre"] = Query(default="recientes"),
    db: Session = Depends(get_db),
) -> dict:
    conditions = [Product.active.is_(True)]

    if q and q.strip():
        term = f"%{q.strip()}%"
        conditions.append(
            or_(
                Product.name.ilike(term),
                Product.brand.ilike(term),
                Product.short_description.ilike(term),
                Product.description.ilike(term),
                Product.family.has(OlfactoryFamily.name.ilike(term)),
            )
        )

    if familia:
        conditions.append(Product.family.has(OlfactoryFamily.slug == familia))

    if tipo:
        conditions.append(Product.product_type == tipo)

    if nota:
        conditions.append(Product.note_links.any(ProductNote.note.has(Note.slug == nota)))

    in_stock = Product.presentations.any(
        and_(Presentation.active.is_(True), Presentation.stock > 0)
    )
    if disponible is True:
        conditions.append(in_stock)
    elif disponible is False:
        conditions.append(~in_stock)

    if destacado is True:
        conditions.append(Product.featured.is_(True))

    total = db.scalar(select(func.count(Product.id)).where(*conditions)) or 0

    order = Product.name.asc() if sort == "nombre" else Product.created_at.desc()
    products = list(
        db.scalars(
            select(Product)
            .where(*conditions)
            .options(*_product_options())
            .order_by(order, Product.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
    )

    return {
        "items": [serialize_list_item(product) for product in products],
        "total": total,
        "page": page,
        "pages": math.ceil(total / page_size) if total else 0,
        "page_size": page_size,
    }


@router.get("/productos/{slug}", response_model=ProductDetail)
def get_product(slug: str, db: Session = Depends(get_db)) -> dict:
    product = db.scalar(
        select(Product)
        .where(Product.slug == slug, Product.active.is_(True))
        .options(
            *_product_options(),
            selectinload(Product.note_links).selectinload(ProductNote.note),
        )
    )
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    related = list(
        db.scalars(
            select(Product)
            .where(
                Product.active.is_(True),
                Product.id != product.id,
                Product.family_id == product.family_id,
            )
            .options(*_product_options())
            .order_by(Product.featured.desc(), Product.created_at.desc())
            .limit(4)
        ).all()
    )

    if len(related) < 4:
        excluded = [product.id, *[item.id for item in related]]
        extra = list(
            db.scalars(
                select(Product)
                .where(Product.active.is_(True), Product.id.notin_(excluded))
                .options(*_product_options())
                .order_by(Product.featured.desc(), Product.created_at.desc())
                .limit(4 - len(related))
            ).all()
        )
        related.extend(extra)

    return serialize_detail(product, related)
