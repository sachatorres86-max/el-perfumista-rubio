import math
import uuid
from io import BytesIO
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from PIL import Image, ImageOps, UnidentifiedImageError
from sqlalchemy import and_, delete, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import require_staff
from app.core.utils import next_sku, unique_slug
from app.models import (
    InventoryMovement,
    ItemType,
    MovementType,
    Note,
    OlfactoryFamily,
    Presentation,
    Product,
    ProductImage,
    ProductNote,
    User,
)
from app.schemas import (
    ImageOut,
    MessageOut,
    PaginatedAdminProducts,
    PresentationOption,
    ProductAdminOut,
    ProductIn,
)
from app.services.serializers import serialize_admin_list_item, serialize_admin_product

router = APIRouter(prefix="/api/admin/productos", tags=["admin · productos"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
MAX_IMAGE_BYTES = 10 * 1024 * 1024


def _product_options():
    return (
        selectinload(Product.family),
        selectinload(Product.presentations),
        selectinload(Product.images),
        selectinload(Product.note_links).selectinload(ProductNote.note),
    )


def _get_product(db: Session, product_id: int) -> Product:
    product = db.scalar(
        select(Product).where(Product.id == product_id).options(*_product_options())
    )
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return product


def _validate_payload(db: Session, payload: ProductIn) -> None:
    if payload.family_id is not None and not db.get(OlfactoryFamily, payload.family_id):
        raise HTTPException(status_code=400, detail="La familia olfativa seleccionada no existe")

    note_ids = {link.note_id for link in payload.notes}
    if note_ids:
        found = set(db.scalars(select(Note.id).where(Note.id.in_(note_ids))).all())
        missing = note_ids - found
        if missing:
            raise HTTPException(status_code=400, detail="Una o más notas olfativas no existen")

    if payload.active and not payload.presentations:
        raise HTTPException(
            status_code=400,
            detail="Agrega al menos una presentación para publicar el producto",
        )


def _sync_notes(db: Session, product: Product, payload: ProductIn) -> None:
    db.execute(delete(ProductNote).where(ProductNote.product_id == product.id))
    seen: set[tuple[int, str]] = set()
    for link in payload.notes:
        key = (link.note_id, link.note_type.value)
        if key in seen:
            continue
        seen.add(key)
        db.add(
            ProductNote(
                product_id=product.id,
                note_id=link.note_id,
                note_type=link.note_type,
            )
        )


def _movement(
    db: Session,
    presentation: Presentation,
    movement_type: MovementType,
    quantity: int,
    resulting_stock: int,
    reason: str,
    user: User,
) -> None:
    db.add(
        InventoryMovement(
            item_type=ItemType.presentacion,
            presentation_id=presentation.id,
            movement_type=movement_type,
            quantity=quantity,
            resulting_stock=resulting_stock,
            reason=reason,
            user_id=user.id,
        )
    )


def _create_presentation(
    db: Session, product: Product, data, user: User
) -> Presentation:
    presentation = Presentation(
        product_id=product.id,
        volume_ml=data.volume_ml,
        bottle_type=data.bottle_type,
        price_cop=data.price_cop,
        stock=data.stock,
        min_stock=data.min_stock,
        active=data.active,
    )
    db.add(presentation)
    db.flush()
    if data.stock > 0:
        _movement(
            db,
            presentation,
            MovementType.entrada,
            data.stock,
            data.stock,
            "Stock inicial",
            user,
        )
    return presentation


@router.get("", response_model=PaginatedAdminProducts)
def list_products(
    q: str | None = Query(default=None, max_length=120),
    estado: str | None = Query(default=None, max_length=30),
    familia: str | None = Query(default=None, max_length=100),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
) -> dict:
    conditions = []
    if q and q.strip():
        term = f"%{q.strip()}%"
        conditions.append(
            or_(
                Product.name.ilike(term),
                Product.sku.ilike(term),
                Product.brand.ilike(term),
            )
        )
    if familia:
        conditions.append(Product.family.has(OlfactoryFamily.slug == familia))

    if estado == "activo":
        conditions.append(Product.active.is_(True))
    elif estado == "inactivo":
        conditions.append(Product.active.is_(False))
    elif estado == "agotado":
        conditions.append(
            and_(
                Product.active.is_(True),
                ~Product.presentations.any(
                    and_(Presentation.active.is_(True), Presentation.stock > 0)
                ),
            )
        )
    elif estado == "stock_bajo":
        conditions.append(
            Product.presentations.any(
                and_(
                    Presentation.active.is_(True),
                    Presentation.stock <= Presentation.min_stock,
                )
            )
        )

    total = db.scalar(select(func.count(Product.id)).where(*conditions)) or 0
    products = list(
        db.scalars(
            select(Product)
            .where(*conditions)
            .options(
                selectinload(Product.family),
                selectinload(Product.presentations),
                selectinload(Product.images),
            )
            .order_by(Product.created_at.desc(), Product.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
    )

    return {
        "items": [serialize_admin_list_item(product) for product in products],
        "total": total,
        "page": page,
        "pages": math.ceil(total / page_size) if total else 0,
        "page_size": page_size,
    }


@router.get("/presentaciones/opciones", response_model=list[PresentationOption])
def presentation_options(
    q: str | None = Query(default=None, max_length=120),
    limit: int = Query(default=200, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
) -> list[dict]:
    query = (
        select(Presentation)
        .join(Product)
        .where(Product.active.is_(True), Presentation.active.is_(True))
        .options(selectinload(Presentation.product))
        .order_by(Product.name, Presentation.volume_ml)
        .limit(limit)
    )
    if q and q.strip():
        term = f"%{q.strip()}%"
        query = query.where(or_(Product.name.ilike(term), Product.sku.ilike(term)))

    return [
        {
            "id": presentation.id,
            "label": f"{presentation.product.name} · {presentation.volume_ml} ml",
            "stock": presentation.stock,
            "product_name": presentation.product.name,
            "volume_ml": presentation.volume_ml,
        }
        for presentation in db.scalars(query).all()
    ]


@router.get("/{product_id}", response_model=ProductAdminOut)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
) -> dict:
    return serialize_admin_product(_get_product(db, product_id))


@router.post("", response_model=ProductAdminOut, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_staff),
) -> dict:
    _validate_payload(db, payload)

    sku = (payload.sku or "").strip().upper() or next_sku(db, Product, "PRD")
    if db.scalar(select(Product.id).where(Product.sku == sku)):
        raise HTTPException(status_code=400, detail="El SKU ya está registrado")

    slug = unique_slug(db, Product, payload.slug or payload.name)

    product = Product(
        sku=sku,
        name=payload.name.strip(),
        slug=slug,
        brand=payload.brand,
        product_type=payload.product_type,
        family_id=payload.family_id,
        concentration=payload.concentration,
        gender=payload.gender,
        short_description=payload.short_description,
        description=payload.description,
        active=payload.active,
        featured=payload.featured,
    )
    db.add(product)
    db.flush()

    _sync_notes(db, product, payload)
    for presentation in payload.presentations:
        _create_presentation(db, product, presentation, user)

    db.commit()
    db.refresh(product)
    return serialize_admin_product(_get_product(db, product.id))


@router.put("/{product_id}", response_model=ProductAdminOut)
def update_product(
    product_id: int,
    payload: ProductIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_staff),
) -> dict:
    _validate_payload(db, payload)
    product = _get_product(db, product_id)

    sku = (payload.sku or "").strip().upper() or product.sku
    if sku != product.sku and db.scalar(select(Product.id).where(Product.sku == sku)):
        raise HTTPException(status_code=400, detail="El SKU ya está registrado")

    product.sku = sku
    product.name = payload.name.strip()
    product.brand = payload.brand
    product.product_type = payload.product_type
    product.family_id = payload.family_id
    product.concentration = payload.concentration
    product.gender = payload.gender
    product.short_description = payload.short_description
    product.description = payload.description
    product.active = payload.active
    product.featured = payload.featured

    if payload.slug and payload.slug != product.slug:
        product.slug = unique_slug(db, Product, payload.slug, exclude_id=product.id)

    _sync_notes(db, product, payload)

    existing = {presentation.id: presentation for presentation in product.presentations}
    incoming_ids = {data.id for data in payload.presentations if data.id}

    for presentation in product.presentations:
        if presentation.id not in incoming_ids:
            presentation.active = False

    for data in payload.presentations:
        if data.id:
            presentation = existing.get(data.id)
            if not presentation:
                raise HTTPException(
                    status_code=400,
                    detail=f"La presentación {data.id} no pertenece a este producto",
                )
            previous_stock = presentation.stock
            presentation.volume_ml = data.volume_ml
            presentation.bottle_type = data.bottle_type
            presentation.price_cop = data.price_cop
            presentation.stock = data.stock
            presentation.min_stock = data.min_stock
            presentation.active = data.active
            if previous_stock != data.stock:
                _movement(
                    db,
                    presentation,
                    MovementType.ajuste,
                    data.stock,
                    data.stock,
                    f"Ajuste desde edición ({previous_stock} → {data.stock})",
                    user,
                )
        else:
            _create_presentation(db, product, data, user)

    db.commit()
    return serialize_admin_product(_get_product(db, product.id))


@router.delete("/{product_id}", response_model=MessageOut)
def deactivate_product(
    product_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
) -> MessageOut:
    product = _get_product(db, product_id)
    product.active = False
    db.commit()
    return MessageOut(message="Producto desactivado")


@router.post("/{product_id}/activar", response_model=MessageOut)
def activate_product(
    product_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
) -> MessageOut:
    product = _get_product(db, product_id)
    product.active = True
    db.commit()
    return MessageOut(message="Producto activado")


@router.post("/{product_id}/imagenes", response_model=ImageOut, status_code=status.HTTP_201_CREATED)
async def upload_image(
    product_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
) -> ProductImage:
    product = _get_product(db, product_id)

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Formato no permitido. Usa JPG, PNG o WebP")

    contents = await file.read()
    if len(contents) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="La imagen supera el límite de 10 MB")

    try:
        image = Image.open(BytesIO(contents))
        image = ImageOps.exif_transpose(image)
        image = image.convert("RGB")
        image.thumbnail((1600, 1600), Image.LANCZOS)
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status_code=400, detail="No se pudo leer la imagen")

    media_root = Path(settings.media_dir).resolve()
    products_dir = media_root / "products"
    products_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{uuid.uuid4().hex}.webp"
    image.save(products_dir / filename, "WEBP", quality=86, method=6)

    sort_order = max((item.sort_order for item in product.images), default=-1) + 1
    product_image = ProductImage(
        product_id=product.id,
        path=f"/media/products/{filename}",
        alt=product.name,
        sort_order=sort_order,
    )
    db.add(product_image)
    db.commit()
    db.refresh(product_image)
    return product_image


@router.delete("/{product_id}/imagenes/{image_id}", response_model=MessageOut)
def delete_image(
    product_id: int,
    image_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
) -> MessageOut:
    image = db.scalar(
        select(ProductImage).where(
            ProductImage.id == image_id,
            ProductImage.product_id == product_id,
        )
    )
    if not image:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")

    if image.path.startswith("/media/"):
        file_path = Path(settings.media_dir).resolve() / image.path.removeprefix("/media/")
        if file_path.is_file():
            file_path.unlink(missing_ok=True)

    db.delete(image)
    db.commit()
    return MessageOut(message="Imagen eliminada")
