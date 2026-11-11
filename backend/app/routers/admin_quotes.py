import math

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.core.deps import require_staff
from app.models import Quote, QuoteStatus, User
from app.schemas import PaginatedQuotes, QuoteOut
from app.services.quotes import (
    cancel_quote,
    confirm_quote,
    expire_pending_orders,
    serialize_quote,
)

router = APIRouter(prefix="/api/admin/cotizaciones", tags=["admin · cotizaciones"])


@router.get("", response_model=PaginatedQuotes)
def list_quotes(
    estado: str | None = Query(
        default=None, pattern="^(pendiente|confirmada|cancelada)$"
    ),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
) -> dict:
    expire_pending_orders(db)

    conditions = []
    if estado:
        conditions.append(Quote.status == estado)

    total = db.scalar(select(func.count(Quote.id)).where(*conditions)) or 0
    quotes = db.scalars(
        select(Quote)
        .where(*conditions)
        .options(
            selectinload(Quote.items),
            selectinload(Quote.client),
            selectinload(Quote.confirmed_by),
            selectinload(Quote.cancelled_by),
        )
        .order_by(
            case((Quote.status == QuoteStatus.pendiente, 0), else_=1),
            Quote.created_at.desc(),
            Quote.id.desc(),
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    return {
        "items": [serialize_quote(quote) for quote in quotes],
        "total": total,
        "page": page,
        "pages": math.ceil(total / page_size) if total else 0,
        "page_size": page_size,
    }


@router.post(
    "/{quote_id}/confirmar",
    response_model=QuoteOut,
    status_code=status.HTTP_201_CREATED,
)
def confirm(
    quote_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_staff),
) -> dict:
    quote = confirm_quote(db, quote_id, user)
    return serialize_quote(quote)


@router.post("/{quote_id}/cancelar", response_model=QuoteOut)
def cancel(
    quote_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_staff),
) -> dict:
    quote = cancel_quote(db, quote_id, user)
    return serialize_quote(quote)
