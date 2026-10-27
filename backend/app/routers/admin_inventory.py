import math

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.core.deps import require_staff
from app.core.utils import next_sku
from app.models import (
    InventoryMovement,
    ItemType,
    MovementType,
    Presentation,
    Supply,
    User,
)
from app.schemas import (
    MessageOut,
    MovementIn,
    MovementOut,
    PaginatedMovements,
    SupplyIn,
    SupplyOut,
    SupplyUpdate,
)
from app.services.serializers import serialize_movement, serialize_supply

router = APIRouter(prefix="/api/admin", tags=["admin · inventario"])


# ------------------------------------------------------------------ insumos


@router.get("/insumos", response_model=list[SupplyOut])
def list_supplies(
    q: str | None = Query(default=None, max_length=120),
    categoria: str | None = Query(default=None, max_length=30),
    stock_bajo: bool | None = Query(default=None),
    activo: bool | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
) -> list[dict]:
    conditions = []
    if q and q.strip():
        term = f"%{q.strip()}%"
        conditions.append(or_(Supply.name.ilike(term), Supply.sku.ilike(term)))
    if categoria:
        conditions.append(Supply.category == categoria)
    if stock_bajo is True:
        conditions.append(Supply.stock <= Supply.min_stock)
    if activo is not None:
        conditions.append(Supply.active.is_(activo))

    supplies = db.scalars(
        select(Supply).where(*conditions).order_by(Supply.name)
    ).all()
    return [serialize_supply(supply) for supply in supplies]


@router.post("/insumos", response_model=SupplyOut, status_code=status.HTTP_201_CREATED)
def create_supply(
    payload: SupplyIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_staff),
) -> dict:
    sku = (payload.sku or "").strip().upper() or next_sku(db, Supply, "INS")
    if db.scalar(select(Supply.id).where(Supply.sku == sku)):
        raise HTTPException(status_code=400, detail="El SKU ya está registrado")

    supply = Supply(
        sku=sku,
        name=payload.name.strip(),
        category=payload.category,
        unit=payload.unit,
        stock=payload.stock,
        min_stock=payload.min_stock,
        unit_cost_cop=payload.unit_cost_cop,
        active=payload.active,
        notes=payload.notes,
    )
    db.add(supply)
    db.flush()

    if payload.stock > 0:
        db.add(
            InventoryMovement(
                item_type=ItemType.insumo,
                supply_id=supply.id,
                movement_type=MovementType.entrada,
                quantity=payload.stock,
                resulting_stock=payload.stock,
                reason="Stock inicial",
                user_id=user.id,
            )
        )

    db.commit()
    db.refresh(supply)
    return serialize_supply(supply)


@router.put("/insumos/{supply_id}", response_model=SupplyOut)
def update_supply(
    supply_id: int,
    payload: SupplyUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
) -> dict:
    supply = db.get(Supply, supply_id)
    if not supply:
        raise HTTPException(status_code=404, detail="Insumo no encontrado")

    supply.name = payload.name.strip()
    supply.category = payload.category
    supply.unit = payload.unit
    supply.min_stock = payload.min_stock
    supply.unit_cost_cop = payload.unit_cost_cop
    supply.active = payload.active
    supply.notes = payload.notes

    db.commit()
    db.refresh(supply)
    return serialize_supply(supply)


@router.delete("/insumos/{supply_id}", response_model=MessageOut)
def deactivate_supply(
    supply_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
) -> MessageOut:
    supply = db.get(Supply, supply_id)
    if not supply:
        raise HTTPException(status_code=404, detail="Insumo no encontrado")
    supply.active = False
    db.commit()
    return MessageOut(message="Insumo desactivado")


# ------------------------------------------------------------------ movimientos


def _movement_options():
    return (
        selectinload(InventoryMovement.presentation).selectinload(Presentation.product),
        selectinload(InventoryMovement.supply),
        selectinload(InventoryMovement.user),
    )


@router.get("/movimientos", response_model=PaginatedMovements)
def list_movements(
    item_type: str | None = Query(default=None, max_length=20),
    movement_type: str | None = Query(default=None, max_length=20),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
) -> dict:
    conditions = []
    if item_type:
        conditions.append(InventoryMovement.item_type == item_type)
    if movement_type:
        conditions.append(InventoryMovement.movement_type == movement_type)

    total = db.scalar(select(func.count(InventoryMovement.id)).where(*conditions)) or 0
    movements = db.scalars(
        select(InventoryMovement)
        .where(*conditions)
        .options(*_movement_options())
        .order_by(InventoryMovement.created_at.desc(), InventoryMovement.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    return {
        "items": [serialize_movement(movement) for movement in movements],
        "total": total,
        "page": page,
        "pages": math.ceil(total / page_size) if total else 0,
        "page_size": page_size,
    }


@router.post("/movimientos", response_model=MovementOut, status_code=status.HTTP_201_CREATED)
def create_movement(
    payload: MovementIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_staff),
) -> dict:
    if payload.movement_type in (MovementType.entrada, MovementType.salida) and payload.quantity <= 0:
        raise HTTPException(status_code=400, detail="La cantidad debe ser mayor que cero")

    if payload.item_type == ItemType.presentacion:
        if not payload.presentation_id:
            raise HTTPException(status_code=400, detail="Selecciona una presentación")
        presentation = db.get(Presentation, payload.presentation_id)
        if not presentation:
            raise HTTPException(status_code=404, detail="Presentación no encontrada")

        previous = presentation.stock
        if payload.movement_type == MovementType.entrada:
            new_stock = previous + payload.quantity
        elif payload.movement_type == MovementType.salida:
            new_stock = previous - payload.quantity
            if new_stock < 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Stock insuficiente. Disponible: {previous}",
                )
        else:
            new_stock = payload.quantity

        presentation.stock = new_stock
        movement = InventoryMovement(
            item_type=ItemType.presentacion,
            presentation_id=presentation.id,
            movement_type=payload.movement_type,
            quantity=payload.quantity,
            resulting_stock=new_stock,
            reason=payload.reason,
            user_id=user.id,
        )
    else:
        if not payload.supply_id:
            raise HTTPException(status_code=400, detail="Selecciona un insumo")
        supply = db.get(Supply, payload.supply_id)
        if not supply:
            raise HTTPException(status_code=404, detail="Insumo no encontrado")

        previous = supply.stock
        if payload.movement_type == MovementType.entrada:
            new_stock = previous + payload.quantity
        elif payload.movement_type == MovementType.salida:
            new_stock = previous - payload.quantity
            if new_stock < 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Stock insuficiente. Disponible: {previous}",
                )
        else:
            new_stock = payload.quantity

        supply.stock = new_stock
        movement = InventoryMovement(
            item_type=ItemType.insumo,
            supply_id=supply.id,
            movement_type=payload.movement_type,
            quantity=payload.quantity,
            resulting_stock=new_stock,
            reason=payload.reason,
            user_id=user.id,
        )

    db.add(movement)
    db.commit()
    db.refresh(movement)
    movement = db.scalar(
        select(InventoryMovement)
        .where(InventoryMovement.id == movement.id)
        .options(*_movement_options())
    )
    return serialize_movement(movement)
