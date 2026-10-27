from app.models import InventoryMovement, Product, Supply


def family_dict(family, product_count: int = 0) -> dict | None:
    if family is None:
        return None
    return {
        "id": family.id,
        "name": family.name,
        "slug": family.slug,
        "description": family.description,
        "product_count": product_count,
    }


def first_image_url(product: Product) -> str | None:
    if product.images:
        return product.images[0].path
    return None


def is_available(product: Product) -> bool:
    return any(presentation.active and presentation.stock > 0 for presentation in product.presentations)


def available_volumes(product: Product) -> list[int]:
    volumes = {
        presentation.volume_ml
        for presentation in product.presentations
        if presentation.active and presentation.stock > 0
    }
    return sorted(volumes)


def serialize_list_item(product: Product) -> dict:
    return {
        "id": product.id,
        "slug": product.slug,
        "name": product.name,
        "brand": product.brand,
        "product_type": product.product_type,
        "concentration": product.concentration,
        "gender": product.gender,
        "short_description": product.short_description,
        "family": family_dict(product.family),
        "image_url": first_image_url(product),
        "available": is_available(product),
        "available_volumes": available_volumes(product),
        "featured": product.featured,
    }


def serialize_detail(product: Product, related: list[Product]) -> dict:
    notes: dict[str, list[dict]] = {"salida": [], "corazon": [], "fondo": []}
    for link in product.note_links:
        notes[link.note_type.value].append(
            {"id": link.note.id, "name": link.note.name, "slug": link.note.slug}
        )

    base = serialize_list_item(product)
    base.update(
        {
            "description": product.description,
            "notes": notes,
            "images": [image.path for image in product.images],
            "presentations": [
                {
                    "id": presentation.id,
                    "volume_ml": presentation.volume_ml,
                    "bottle_type": presentation.bottle_type,
                    "available": presentation.active and presentation.stock > 0,
                }
                for presentation in product.presentations
                if presentation.active
            ],
            "related": [serialize_list_item(item) for item in related],
        }
    )
    return base


def serialize_admin_product(product: Product) -> dict:
    active_presentations = [presentation for presentation in product.presentations if presentation.active]
    prices = [presentation.price_cop for presentation in active_presentations]
    return {
        "id": product.id,
        "sku": product.sku,
        "name": product.name,
        "slug": product.slug,
        "brand": product.brand,
        "product_type": product.product_type,
        "family_id": product.family_id,
        "family": family_dict(product.family),
        "concentration": product.concentration,
        "gender": product.gender,
        "short_description": product.short_description,
        "description": product.description,
        "active": product.active,
        "featured": product.featured,
        "created_at": product.created_at,
        "notes": [
            {"note_id": link.note_id, "note_type": link.note_type, "name": link.note.name}
            for link in product.note_links
        ],
        "presentations": [
            {
                "id": presentation.id,
                "volume_ml": presentation.volume_ml,
                "bottle_type": presentation.bottle_type,
                "price_cop": presentation.price_cop,
                "stock": presentation.stock,
                "min_stock": presentation.min_stock,
                "active": presentation.active,
            }
            for presentation in product.presentations
        ],
        "images": [
            {
                "id": image.id,
                "path": image.path,
                "alt": image.alt,
                "sort_order": image.sort_order,
            }
            for image in product.images
        ],
        "total_stock": sum(presentation.stock for presentation in active_presentations),
        "price_min": min(prices) if prices else None,
        "price_max": max(prices) if prices else None,
        "image_url": first_image_url(product),
    }


def serialize_admin_list_item(product: Product) -> dict:
    active_presentations = [presentation for presentation in product.presentations if presentation.active]
    prices = [presentation.price_cop for presentation in active_presentations]
    return {
        "id": product.id,
        "sku": product.sku,
        "name": product.name,
        "slug": product.slug,
        "brand": product.brand,
        "product_type": product.product_type,
        "family_name": product.family.name if product.family else None,
        "active": product.active,
        "featured": product.featured,
        "total_stock": sum(presentation.stock for presentation in active_presentations),
        "presentation_count": len(active_presentations),
        "price_min": min(prices) if prices else None,
        "price_max": max(prices) if prices else None,
        "image_url": first_image_url(product),
        "available": is_available(product),
    }


def serialize_supply(supply: Supply) -> dict:
    return {
        "id": supply.id,
        "sku": supply.sku,
        "name": supply.name,
        "category": supply.category,
        "unit": supply.unit,
        "stock": supply.stock,
        "min_stock": supply.min_stock,
        "unit_cost_cop": supply.unit_cost_cop,
        "active": supply.active,
        "notes": supply.notes,
        "low_stock": supply.stock <= supply.min_stock,
    }


def serialize_movement(movement: InventoryMovement) -> dict:
    if movement.item_type.value == "presentacion" and movement.presentation:
        product_name = (
            movement.presentation.product.name if movement.presentation.product else "Producto"
        )
        label = f"{product_name} · {movement.presentation.volume_ml} ml"
    elif movement.supply:
        label = movement.supply.name
    else:
        label = "Artículo eliminado"

    return {
        "id": movement.id,
        "item_type": movement.item_type,
        "item_label": label,
        "presentation_id": movement.presentation_id,
        "supply_id": movement.supply_id,
        "movement_type": movement.movement_type,
        "quantity": movement.quantity,
        "resulting_stock": movement.resulting_stock,
        "reason": movement.reason,
        "user_name": movement.user.name if movement.user else None,
        "created_at": movement.created_at,
    }
