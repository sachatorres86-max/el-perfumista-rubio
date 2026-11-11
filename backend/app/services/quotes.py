from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.orm import Session, selectinload

from app.models import (
    InventoryMovement,
    ItemType,
    MovementType,
    Presentation,
    Product,
    Quote,
    QuoteItem,
    QuoteStatus,
    User,
)

ORDER_EXPIRY_HOURS = 48


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _is_expired(value: datetime | None, now: datetime) -> bool:
    if value is None:
        return False
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value <= now


def serialize_quote(quote: Quote) -> dict:
    return {
        "id": quote.id,
        "status": quote.status,
        "client_name": quote.client.name if quote.client else None,
        "client_email": quote.client.email if quote.client else None,
        "total_cop": quote.total_cop,
        "total_units": quote.total_units,
        "created_at": quote.created_at,
        "expires_at": quote.expires_at,
        "confirmed_by_name": quote.confirmed_by.name if quote.confirmed_by else None,
        "cancelled_at": quote.cancelled_at,
        "cancelled_by_name": quote.cancelled_by.name if quote.cancelled_by else None,
        "cancelled_automatically": (
            quote.cancelled_at is not None and quote.cancelled_by_id is None
        ),
        "items": [
            {
                "id": item.id,
                "presentation_id": item.presentation_id,
                "product_name": item.product_name,
                "product_slug": item.product_slug,
                "volume_ml": item.volume_ml,
                "bottle_type": item.bottle_type,
                "unit_price_cop": item.unit_price_cop,
                "quantity": item.quantity,
                "line_total_cop": item.unit_price_cop * item.quantity,
            }
            for item in quote.items
        ],
    }


def load_quote(db: Session, quote_id: int) -> Quote | None:
    return db.scalar(
        select(Quote)
        .where(Quote.id == quote_id)
        .options(
            selectinload(Quote.items),
            selectinload(Quote.client),
            selectinload(Quote.confirmed_by),
            selectinload(Quote.cancelled_by),
        )
    )


def expire_pending_orders(db: Session, *, now: datetime | None = None) -> int:
    """Cancela los pedidos pendientes cuya ventana de 48 horas ya terminó.

    No hay stock que restaurar porque el inventario solo se descuenta al
    confirmar. Se ejecuta antes de listar o confirmar pedidos, de modo que el
    estado siempre está al día cuando el personal entra al módulo.
    """
    moment = now or _now()
    result = db.execute(
        update(Quote)
        .where(
            Quote.status == QuoteStatus.pendiente,
            Quote.expires_at.is_not(None),
            Quote.expires_at <= moment,
        )
        .values(status=QuoteStatus.cancelada, cancelled_at=moment)
    )
    if result.rowcount:
        db.commit()
    return result.rowcount or 0


def create_order(db: Session, quantities: dict[int, int], client: User) -> Quote:
    """Registra un pedido pendiente sin reservar ni descontar stock."""
    if not quantities:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Tu carrito está vacío",
        )

    presentations = db.scalars(
        select(Presentation)
        .where(Presentation.id.in_(quantities))
        .options(selectinload(Presentation.product))
    ).all()
    by_id = {presentation.id: presentation for presentation in presentations}

    problems: list[str] = []
    for presentation_id, quantity in quantities.items():
        presentation = by_id.get(presentation_id)
        if presentation is None:
            problems.append("Una presentación de tu carrito ya no existe")
            continue
        if not presentation.active or not presentation.product.active:
            problems.append(f"{presentation.product.name} ya no está publicado")
            continue
        if presentation.stock < quantity:
            problems.append(
                f"{presentation.product.name} de {presentation.volume_ml} ml "
                f"solo tiene {presentation.stock} unidades"
            )

    if problems:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se pudo realizar el pedido: " + "; ".join(problems),
        )

    now = _now()
    quote = Quote(
        status=QuoteStatus.pendiente,
        client_id=client.id,
        total_cop=0,
        total_units=0,
        expires_at=now + timedelta(hours=ORDER_EXPIRY_HOURS),
    )
    db.add(quote)
    db.flush()

    total_cop = 0
    total_units = 0
    for presentation_id, quantity in quantities.items():
        presentation = by_id[presentation_id]
        total_cop += presentation.price_cop * quantity
        total_units += quantity
        quote.items.append(
            QuoteItem(
                presentation_id=presentation.id,
                product_name=presentation.product.name,
                product_slug=presentation.product.slug,
                volume_ml=presentation.volume_ml,
                bottle_type=presentation.bottle_type,
                unit_price_cop=presentation.price_cop,
                quantity=quantity,
            )
        )

    quote.total_cop = total_cop
    quote.total_units = total_units
    db.commit()

    loaded = load_quote(db, quote.id)
    assert loaded is not None
    return loaded


def confirm_quote(db: Session, quote_id: int, user: User) -> Quote:
    """Confirma un pedido pendiente y descuenta stock de forma atómica."""
    expire_pending_orders(db)

    quote = db.scalar(
        select(Quote)
        .where(Quote.id == quote_id)
        .options(selectinload(Quote.items))
        .with_for_update()
    )
    if quote is None:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    if quote.status != QuoteStatus.pendiente:
        if quote.status == QuoteStatus.confirmada:
            detail = "Este pedido ya fue confirmado"
        else:
            detail = "Este pedido ya fue cancelado"
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)

    now = _now()
    if _is_expired(quote.expires_at, now):
        quote.status = QuoteStatus.cancelada
        quote.cancelled_at = now
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El pedido venció después de 48 horas sin confirmación",
        )

    presentation_ids = [
        item.presentation_id for item in quote.items if item.presentation_id is not None
    ]
    presentations = db.scalars(
        select(Presentation)
        .where(Presentation.id.in_(presentation_ids))
        .options(selectinload(Presentation.product))
        .with_for_update()
    ).all()
    by_id = {presentation.id: presentation for presentation in presentations}

    problems: list[str] = []
    for item in quote.items:
        if item.presentation_id is None:
            problems.append(f"{item.product_name} ya no está disponible")
            continue
        presentation = by_id.get(item.presentation_id)
        if presentation is None:
            problems.append(f"{item.product_name} ya no existe")
            continue
        if not presentation.active or not presentation.product.active:
            problems.append(f"{presentation.product.name} ya no está publicado")
            continue
        if presentation.stock < item.quantity:
            problems.append(
                f"{presentation.product.name} de {presentation.volume_ml} ml "
                f"solo tiene {presentation.stock} unidades"
            )

    if problems:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se pudo confirmar: " + "; ".join(problems),
        )

    quote.status = QuoteStatus.confirmada
    quote.confirmed_by_id = user.id
    for item in quote.items:
        presentation = by_id[item.presentation_id]  # type: ignore[index]
        presentation.stock -= item.quantity
        db.add(
            InventoryMovement(
                item_type=ItemType.presentacion,
                presentation_id=presentation.id,
                movement_type=MovementType.salida,
                quantity=item.quantity,
                resulting_stock=presentation.stock,
                reason=f"Pedido #{quote.id} confirmado",
                user_id=user.id,
            )
        )

    db.commit()

    loaded = load_quote(db, quote.id)
    assert loaded is not None
    return loaded


def cancel_quote(db: Session, quote_id: int, user: User) -> Quote:
    """Cancela un pedido confirmado y devuelve el stock reservado."""
    quote = db.scalar(
        select(Quote)
        .where(Quote.id == quote_id)
        .options(selectinload(Quote.items))
        .with_for_update()
    )
    if quote is None:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    if quote.status != QuoteStatus.confirmada:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Solo se pueden cancelar pedidos confirmados",
        )

    for item in quote.items:
        if item.presentation_id is None:
            continue
        presentation = db.scalar(
            select(Presentation)
            .where(Presentation.id == item.presentation_id)
            .with_for_update()
        )
        if presentation is None:
            continue
        presentation.stock += item.quantity
        db.add(
            InventoryMovement(
                item_type=ItemType.presentacion,
                presentation_id=presentation.id,
                movement_type=MovementType.entrada,
                quantity=item.quantity,
                resulting_stock=presentation.stock,
                reason=f"Cancelación pedido #{quote.id}",
                user_id=user.id,
            )
        )

    quote.status = QuoteStatus.cancelada
    quote.cancelled_at = _now()
    quote.cancelled_by_id = user.id
    db.commit()

    loaded = load_quote(db, quote.id)
    assert loaded is not None
    return loaded
