import csv
import io
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_staff
from app.models import Presentation, Product, Supply, User

router = APIRouter(prefix="/api/admin/reportes", tags=["admin · reportes"])


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


@router.get("/resumen")
def summary(
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
) -> dict:
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

    return {
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


def _csv_response(rows: list[list], filename: str) -> StreamingResponse:
    output = io.StringIO()
    writer = csv.writer(output, delimiter=";")
    for row in rows:
        writer.writerow(row)
    content = ("\ufeff" + output.getvalue()).encode("utf-8")
    return StreamingResponse(
        iter([content]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/export")
def export_csv(
    tipo: str = Query(default="inventario", pattern="^(inventario|agotados|stock_bajo)$"),
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
) -> StreamingResponse:
    header = [
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
    rows: list[list] = [header]

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
                    "Stock bajo" if supply.stock <= supply.min_stock else "Disponible",
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

    filename = f"{tipo}-{datetime.now().strftime('%Y%m%d-%H%M')}.csv"
    return _csv_response(rows, filename)
