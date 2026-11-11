from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_cliente
from app.models import User
from app.schemas import CartValidateIn, CartValidationOut
from app.services.cart import normalize_cart_quantities, resolve_cart

router = APIRouter(prefix="/api/cliente", tags=["cliente · carrito"])


@router.post("/carrito/validar", response_model=CartValidationOut)
def validate_cart(
    payload: CartValidateIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_cliente),
) -> dict:
    """Valida el carrito local del cliente contra el catálogo vigente.

    No devuelve precios ni stock exacto: solo si cada línea se puede atender y
    si todavía se puede aumentar la cantidad.
    """
    quantities = normalize_cart_quantities(
        (item.presentation_id, item.quantity) for item in payload.items
    )
    return resolve_cart(db, quantities)
