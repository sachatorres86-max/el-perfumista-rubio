from datetime import datetime, time, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.core.deps import require_staff
from app.models import (
    InventoryMovement,
    Presentation,
    Product,
    Quote,
    QuoteStatus,
    Supply,
    User,
)
from app.services.report_pdf import build_report_pdf
from app.services.serializers import serialize_movement

router = APIRouter(prefix="/api/admin/reportes", tags=["admin · reportes"])

ReportPeriod = Literal["diario", "semanal", "mensual"]

PERIOD_LABELS = {
    "diario": "Hoy",
    "semanal": "Esta semana",
    "mensual": "Este mes",
}

REPORT_TITLES = {
    "inventario": "Reporte de inventario",
    "agotados": "Reporte de productos agotados",
    "stock_bajo": "Reporte de stock bajo",
    "movimientos": "Reporte de movimientos",
    "cotizaciones": "Reporte de cotizaciones",
}

REPORT_COL_RATIOS = {
    "inventario": [0.7, 1.0, 2.1, 1.0, 0.65, 0.8, 1.0, 1.1, 0.9],
    "agotados": [0.7, 1.0, 2.4, 1.0, 0.65, 0.85, 1.0, 0.9, 0.8],
    "stock_bajo": [0.7, 1.0, 2.3, 1.0, 0.65, 0.8, 1.0, 1.0, 0.85],
    "movimientos": [1.25, 1.0, 2.0, 0.9, 0.7, 0.75, 1.9, 1.0],
    "cotizaciones": [0.45, 1.15, 0.8, 0.65, 0.9, 2.0, 0.9, 0.55, 0.9, 0.9, 1.0, 1.1, 1.0],
}


def _period_bounds(periodo: ReportPeriod) -> tuple[datetime, datetime]:
    now = datetime.now(timezone.utc)
    today = now.date()
    if periodo == "diario":
        start_date = today
    elif periodo == "semanal":
        start_date = today - timedelta(days=today.weekday())
    else:
        start_date = today.replace(day=1)
    start = datetime.combine(start_date, time.min, tzinfo=timezone.utc)
    return start, now


def _presentation_rows(db: Session, only_out: bool = False, only_low: bool = False):
    query = (
        select(Presentation, Product)
        .join(Product, Presentation.product_id == Product.id)
        .where(Product.active.is_(True), Presentation.active.is_(True))
        .order_by(Product.name, Presentation.volume_ml)
    )
    if only_out:
        query = query.where(Presentation.stock == 0)
    elif only_low:
        query = query.where(Presentation.stock <= Presentation.min_stock)
    return db.execute(query).all()


def _period_movements(db: Session, start: datetime, end: datetime) -> list[InventoryMovement]:
    return list(
        db.scalars(
            select(InventoryMovement)
            .where(
                InventoryMovement.created_at >= start,
                InventoryMovement.created_at <= end,
            )
            .options(
                selectinload(InventoryMovement.presentation).selectinload(
                    Presentation.product
                ),
                selectinload(InventoryMovement.supply),
                selectinload(InventoryMovement.user),
            )
            .order_by(
                InventoryMovement.created_at.desc(),
                InventoryMovement.id.desc(),
            )
        ).all()
    )


@router.get("/resumen")
def summary(
    periodo: ReportPeriod = Query(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
) -> dict:
    start, end = _period_bounds(periodo)
    low_stock_rows = _presentation_rows(db, only_low=True)
    out_rows = _presentation_rows(db, only_out=True)

    low_supplies = db.scalars(
        select(Supply)
        .where(Supply.active.is_(True), Supply.stock <= Supply.min_stock)
        .order_by(Supply.stock)
    ).all()

    product_value = db.scalar(
        select(func.coalesce(func.sum(Presentation.price_cop * Presentation.stock), 0))
        .join(Product, Presentation.product_id == Product.id)
        .where(Product.active.is_(True), Presentation.active.is_(True))
    ) or 0
    supply_value = db.scalar(
        select(func.coalesce(func.sum(Supply.unit_cost_cop * Supply.stock), 0))
        .where(Supply.active.is_(True))
    ) or 0

    movements = _period_movements(db, start, end)
    confirmed_quotes = db.scalars(
        select(Quote).where(
            Quote.status == QuoteStatus.confirmada,
            Quote.created_at >= start,
            Quote.created_at <= end,
        )
    ).all()
    cancelled_quotes = db.scalars(
        select(Quote).where(
            Quote.status == QuoteStatus.cancelada,
            Quote.cancelled_at >= start,
            Quote.cancelled_at <= end,
        )
    ).all()

    activity = {
        "movements_total": len(movements),
        "entries_units": sum(
            movement.quantity
            for movement in movements
            if movement.movement_type.value == "entrada"
        ),
        "exits_units": sum(
            movement.quantity
            for movement in movements
            if movement.movement_type.value == "salida"
        ),
        "adjustments_total": sum(
            1 for movement in movements if movement.movement_type.value == "ajuste"
        ),
        "quotes_confirmed": len(confirmed_quotes),
        "quotes_cancelled": len(cancelled_quotes),
        "quotes_total_cop": sum(quote.total_cop for quote in confirmed_quotes),
        "quotes_units": sum(quote.total_units for quote in confirmed_quotes),
    }

    return {
        "periodo": periodo,
        "period_label": PERIOD_LABELS[periodo],
        "period_start": start,
        "period_end": end,
        "activity": activity,
        "recent_movements": [
            serialize_movement(movement) for movement in movements[:10]
        ],
        "low_stock_presentations": [
            {
                "presentation_id": presentation.id,
                "product_id": product.id,
                "product_name": product.name,
                "sku": product.sku,
                "volume_ml": presentation.volume_ml,
                "stock": presentation.stock,
                "min_stock": presentation.min_stock,
                "price_cop": presentation.price_cop,
            }
            for presentation, product in low_stock_rows
        ],
        "out_of_stock_presentations": [
            {
                "presentation_id": presentation.id,
                "product_id": product.id,
                "product_name": product.name,
                "sku": product.sku,
                "volume_ml": presentation.volume_ml,
                "min_stock": presentation.min_stock,
            }
            for presentation, product in out_rows
        ],
        "low_stock_supplies": [
            {
                "supply_id": supply.id,
                "name": supply.name,
                "sku": supply.sku,
                "unit": supply.unit.value,
                "stock": supply.stock,
                "min_stock": supply.min_stock,
            }
            for supply in low_supplies
        ],
        "inventory_value_cop": int(product_value) + int(supply_value),
        "product_value_cop": int(product_value),
        "supply_value_cop": int(supply_value),
        "counts": {
            "low_stock_presentations": len(low_stock_rows),
            "out_of_stock_presentations": len(out_rows),
            "low_stock_supplies": len(low_supplies),
        },
    }


@router.get("/export")
def export_pdf(
    tipo: str = Query(
        default="inventario",
        pattern="^(inventario|agotados|stock_bajo|movimientos|cotizaciones)$",
    ),
    periodo: ReportPeriod = Query(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
) -> Response:
    start, end = _period_bounds(periodo)

    if tipo == "movimientos":
        rows: list[list] = [
            [
                "Fecha",
                "Tipo de artículo",
                "Artículo",
                "Movimiento",
                "Cantidad",
                "Stock final",
                "Motivo",
                "Usuario",
            ]
        ]
        for movement in _period_movements(db, start, end):
            item = serialize_movement(movement)
            rows.append(
                [
                    movement.created_at.isoformat() if movement.created_at else "",
                    "Producto" if item["item_type"].value == "presentacion" else "Insumo",
                    item["item_label"],
                    movement.movement_type.value,
                    movement.quantity,
                    movement.resulting_stock,
                    movement.reason or "",
                    item["user_name"] or "",
                ]
            )
    elif tipo == "cotizaciones":
        rows = [
            [
                "ID",
                "Fecha",
                "Estado",
                "Unidades",
                "Total COP",
                "Producto",
                "Presentación",
                "Cantidad",
                "Precio unitario COP",
                "Subtotal COP",
                "Confirmada por",
                "Cancelada el",
                "Cancelada por",
            ]
        ]
        quotes = db.scalars(
            select(Quote)
            .where(
                or_(
                    Quote.created_at.between(start, end),
                    Quote.cancelled_at.between(start, end),
                )
            )
            .options(
                selectinload(Quote.items),
                selectinload(Quote.confirmed_by),
                selectinload(Quote.cancelled_by),
            )
            .order_by(Quote.created_at.desc(), Quote.id.desc())
        ).all()
        for quote in quotes:
            for item in quote.items:
                rows.append(
                    [
                        quote.id,
                        quote.created_at.isoformat() if quote.created_at else "",
                        quote.status.value,
                        quote.total_units,
                        quote.total_cop,
                        item.product_name,
                        f"{item.volume_ml} ml",
                        item.quantity,
                        item.unit_price_cop,
                        item.unit_price_cop * item.quantity,
                        quote.confirmed_by.name if quote.confirmed_by else "",
                        quote.cancelled_at.isoformat() if quote.cancelled_at else "",
                        quote.cancelled_by.name if quote.cancelled_by else "",
                    ]
                )
    else:
        rows = [
            [
                "Tipo",
                "SKU",
                "Nombre",
                "Detalle",
                "Stock",
                "Stock mínimo",
                "Costo unitario COP",
                "Valor COP",
                "Estado",
            ]
        ]

        if tipo == "inventario":
            for presentation, product in _presentation_rows(db):
                rows.append(
                    [
                        "Producto",
                        product.sku,
                        product.name,
                        f"{presentation.volume_ml} ml",
                        presentation.stock,
                        presentation.min_stock,
                        presentation.price_cop,
                        presentation.price_cop * presentation.stock,
                        "Agotado" if presentation.stock == 0 else "Disponible",
                    ]
                )
            for supply in db.scalars(
                select(Supply).where(Supply.active.is_(True)).order_by(Supply.name)
            ).all():
                rows.append(
                    [
                        "Insumo",
                        supply.sku,
                        supply.name,
                        supply.unit.value,
                        supply.stock,
                        supply.min_stock,
                        supply.unit_cost_cop,
                        supply.unit_cost_cop * supply.stock,
                        "Stock bajo"
                        if supply.stock <= supply.min_stock
                        else "Disponible",
                    ]
                )
        elif tipo == "agotados":
            for presentation, product in _presentation_rows(db, only_out=True):
                rows.append(
                    [
                        "Producto",
                        product.sku,
                        product.name,
                        f"{presentation.volume_ml} ml",
                        0,
                        presentation.min_stock,
                        presentation.price_cop,
                        0,
                        "Agotado",
                    ]
                )
        else:
            for presentation, product in _presentation_rows(db, only_low=True):
                rows.append(
                    [
                        "Producto",
                        product.sku,
                        product.name,
                        f"{presentation.volume_ml} ml",
                        presentation.stock,
                        presentation.min_stock,
                        presentation.price_cop,
                        presentation.price_cop * presentation.stock,
                        "Stock bajo",
                    ]
                )
            for supply in db.scalars(
                select(Supply)
                .where(Supply.active.is_(True), Supply.stock <= Supply.min_stock)
                .order_by(Supply.name)
            ).all():
                rows.append(
                    [
                        "Insumo",
                        supply.sku,
                        supply.name,
                        supply.unit.value,
                        supply.stock,
                        supply.min_stock,
                        supply.unit_cost_cop,
                        supply.unit_cost_cop * supply.stock,
                        "Stock bajo",
                    ]
                )

    pdf = build_report_pdf(
        title=REPORT_TITLES[tipo],
        period_label=PERIOD_LABELS[periodo],
        period_start=start,
        period_end=end,
        headers=rows[0],
        rows=rows[1:],
        col_ratios=REPORT_COL_RATIOS[tipo],
    )
    filename = f"reporte-{tipo}-{periodo}-{datetime.now().strftime('%Y%m%d-%H%M')}.pdf"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
