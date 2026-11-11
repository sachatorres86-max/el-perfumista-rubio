from collections.abc import Iterable

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Presentation, Product
from app.services.serializers import first_image_url


def normalize_cart_quantities(
    items: Iterable[tuple[int, int]],
) -> dict[int, int]:
    """Agrupa las líneas por presentación y limita cada cantidad a 99."""
    quantities: dict[int, int] = {}
    for presentation_id, quantity in items:
        quantities[presentation_id] = min(
            99, quantities.get(presentation_id, 0) + quantity
        )
    return quantities


def resolve_cart(
    db: Session,
    quantities: dict[int, int],
    *,
    include_prices: bool = False,
) -> dict:
    """Resuelve las presentaciones del carrito contra el catálogo vigente.

    Sin ``include_prices`` no se incluye ningún precio en las líneas. La
    disponibilidad se calcula a partir del stock actual de la presentación.
    """
    if not quantities:
        return {
            "items": [],
            "unavailable_items": [],
            "total_units": 0,
            "valid": True,
        }

    presentations = db.scalars(
        select(Presentation)
        .where(Presentation.id.in_(quantities))
        .options(selectinload(Presentation.product).selectinload(Product.images))
    ).all()
    by_id = {presentation.id: presentation for presentation in presentations}

    unavailable_items = [
        presentation_id
        for presentation_id in quantities
        if presentation_id not in by_id
    ]

    lines: list[dict] = []
    for presentation_id, quantity in quantities.items():
        presentation = by_id.get(presentation_id)
        if presentation is None:
            continue

        product = presentation.product
        active = presentation.active and product.active

        if not active or presentation.stock <= 0:
            status = "no_disponible"
        elif presentation.stock < quantity:
            status = "insuficiente"
        else:
            status = "disponible"

        line = {
            "presentation_id": presentation.id,
            "product_id": product.id,
            "product_name": product.name,
            "product_slug": product.slug,
            "brand": product.brand,
            "volume_ml": presentation.volume_ml,
            "bottle_type": presentation.bottle_type,
            "image_url": first_image_url(product),
            "quantity": quantity,
            "status": status,
            "can_increase": active and presentation.stock > quantity,
        }
        if include_prices:
            line["unit_price_cop"] = presentation.price_cop
            line["line_total_cop"] = presentation.price_cop * quantity
        lines.append(line)

    return {
        "items": lines,
        "unavailable_items": unavailable_items,
        "total_units": sum(line["quantity"] for line in lines),
        "valid": not unavailable_items
        and all(line["status"] == "disponible" for line in lines),
    }
