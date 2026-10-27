from fastapi import APIRouter, Depends
from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.core.deps import require_staff
from app.models import (
    InventoryMovement,
    OlfactoryFamily,
    Presentation,
    Product,
    Supply,
    User,
)
from app.services.serializers import serialize_movement

router = APIRouter(prefix="/api/admin/dashboard", tags=["admin · panel"])


@router.get("")
def dashboard(
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
) -> dict:
    products_total = db.scalar(select(func.count(Product.id))) or 0
    products_active = db.scalar(
        select(func.count(Product.id)).where(Product.active.is_(True))
    ) or 0
    presentations_count = db.scalar(
        select(func.count(Presentation.id))
        .join(Product)
        .where(Product.active.is_(True), Presentation.active.is_(True))
    ) or 0
    supplies_count = db.scalar(
        select(func.count(Supply.id)).where(Supply.active.is_(True))
    ) or 0

    in_stock = Product.presentations.any(
        and_(Presentation.active.is_(True), Presentation.stock > 0)
    )
    out_of_stock_products = db.scalar(
        select(func.count(Product.id)).where(Product.active.is_(True), ~in_stock)
    ) or 0

    low_stock_presentations = db.scalar(
        select(func.count(Presentation.id))
        .join(Product)
        .where(
            Product.active.is_(True),
            Presentation.active.is_(True),
            Presentation.stock <= Presentation.min_stock,
        )
    ) or 0
    low_stock_supplies = db.scalar(
        select(func.count(Supply.id)).where(
            Supply.active.is_(True), Supply.stock <= Supply.min_stock
        )
    ) or 0

    product_value = db.scalar(
        select(func.coalesce(func.sum(Presentation.price_cop * Presentation.stock), 0))
        .join(Product)
        .where(Product.active.is_(True), Presentation.active.is_(True))
    ) or 0
    supply_value = db.scalar(
        select(func.coalesce(func.sum(Supply.unit_cost_cop * Supply.stock), 0)).where(
            Supply.active.is_(True)
        )
    ) or 0

    family_rows = db.execute(
        select(OlfactoryFamily.name, func.count(Product.id))
        .outerjoin(
            Product,
            and_(Product.family_id == OlfactoryFamily.id, Product.active.is_(True)),
        )
        .group_by(OlfactoryFamily.id)
        .order_by(func.count(Product.id).desc())
    ).all()

    recent = db.scalars(
        select(InventoryMovement)
        .options(
            selectinload(InventoryMovement.presentation).selectinload(Presentation.product),
            selectinload(InventoryMovement.supply),
            selectinload(InventoryMovement.user),
        )
        .order_by(InventoryMovement.created_at.desc(), InventoryMovement.id.desc())
        .limit(8)
    ).all()

    return {
        "products_total": products_total,
        "products_active": products_active,
        "presentations_count": presentations_count,
        "supplies_count": supplies_count,
        "out_of_stock_products": out_of_stock_products,
        "low_stock_presentations": low_stock_presentations,
        "low_stock_supplies": low_stock_supplies,
        "inventory_value_cop": int(product_value) + int(supply_value),
        "product_value_cop": int(product_value),
        "supply_value_cop": int(supply_value),
        "families": [{"name": name, "count": count} for name, count in family_rows],
        "recent_movements": [serialize_movement(movement) for movement in recent],
    }
