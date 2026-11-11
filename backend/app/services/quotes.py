import hashlib
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
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
from app.services.cart_token import decode_cart_token


def quote_token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def serialize_quote(quote: Quote) -> dict:
    return {
        "id": quote.id,
        "status": quote.status,
        "total_cop": quote.total_cop,
        "total_units": quote.total_units,
        "created_at": quote.created_at,
        "cancelled_at": quote.cancelled_at,
        "confirmed_by_name": quote.confirmed_by.name if quote.confirmed_by else None,
        "cancelled_by_name": quote.cancelled_by.name if quote.cancelled_by else None,
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
            selectinload(Quote.confirmed_by),
            selectinload(Quote.cancelled_by),
        )
    )


def get_active_quote_for_token(db: Session, token: str) -> Quote | None:
    return db.scalar(
        select(Quote).where(
            Quote.source_token_hash == quote_token_hash(token),
            Quote.status == QuoteStatus.confirmada,
        )
    )


def get_latest_quote_for_token(db: Session, token: str) -> Quote | None:
    return db.scalar(
        select(Quote)
        .where(Quote.source_token_hash == quote_token_hash(token))
        .order_by(Quote.id.desc())
        .limit(1)
    )


def confirm_quote(
    db: Session,
    token: str,
    user: User,
) -> Quote:
    """Crea la cotización y descuenta stock de forma atómica.

    Las presentaciones se bloquean durante la transacción para que dos
    confirmaciones simultáneas no vendan el mismo stock.
    """
    from app.services.cart_token import InvalidCartToken

    try:
        quantities = decode_cart_token(token)
    except InvalidCartToken:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enlace de cotización inválido o incompleto",
        )

    if get_active_quote_for_token(db, token) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Esta cotización ya fue confirmada. Puedes consultarla en Cotizaciones.",
        )

    presentations = db.scalars(
        select(Presentation)
        .where(Presentation.id.in_(quantities))
        .options(selectinload(Presentation.product).selectinload(Product.images))
        .with_for_update()
    ).all()
    by_id = {presentation.id: presentation for presentation in presentations}

    problems: list[str] = []
    for presentation_id, quantity in quantities.items():
        presentation = by_id.get(presentation_id)
        if presentation is None:
            problems.append(f"La presentación {presentation_id} ya no existe")
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
            detail="No se pudo confirmar: " + "; ".join(problems),
        )

    quote = Quote(
        source_token_hash=quote_token_hash(token),
        status=QuoteStatus.confirmada,
        total_cop=0,
        total_units=0,
        confirmed_by_id=user.id,
    )
    db.add(quote)
    db.flush()

    total_cop = 0
    total_units = 0
    for presentation_id, quantity in quantities.items():
        presentation = by_id[presentation_id]
        line_total = presentation.price_cop * quantity
        total_cop += line_total
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
        presentation.stock -= quantity
        db.add(
            InventoryMovement(
                item_type=ItemType.presentacion,
                presentation_id=presentation.id,
                movement_type=MovementType.salida,
                quantity=quantity,
                resulting_stock=presentation.stock,
                reason=f"Cotización #{quote.id} confirmada",
                user_id=user.id,
            )
        )

    quote.total_cop = total_cop
    quote.total_units = total_units
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Esta cotización ya fue confirmada. Puedes consultarla en Cotizaciones.",
        )

    loaded = load_quote(db, quote.id)
    assert loaded is not None
    return loaded


def cancel_quote(
    db: Session,
    quote_id: int,
    user: User,
) -> Quote:
    """Cancela una cotización confirmada y devuelve el stock reservado."""
    quote = db.scalar(
        select(Quote)
        .where(Quote.id == quote_id)
        .options(selectinload(Quote.items))
        .with_for_update()
    )
    if quote is None:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    if quote.status != QuoteStatus.confirmada:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Esta cotización ya fue cancelada",
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
                reason=f"Cancelación cotización #{quote.id}",
                user_id=user.id,
            )
        )

    quote.status = QuoteStatus.cancelada
    quote.cancelled_at = datetime.now(timezone.utc)
    quote.cancelled_by_id = user.id
    db.commit()

    loaded = load_quote(db, quote.id)
    assert loaded is not None
    return loaded
