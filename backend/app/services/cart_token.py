import base64
import binascii
import json

MAX_CART_ITEMS = 100
MAX_QUANTITY = 99
MAX_TOKEN_LENGTH = 10_000
MAX_DECODED_BYTES = 4_096


class InvalidCartToken(ValueError):
    """El token no representa un carrito que se pueda cotizar."""


def encode_cart_token(items: list[tuple[int, int]]) -> str:
    """Serializa las líneas como base64url de ``[[presentation_id, quantity]]``."""
    payload = json.dumps(items, separators=(",", ":")).encode("utf-8")
    return base64.urlsafe_b64encode(payload).decode("ascii").rstrip("=")


def decode_cart_token(token: str) -> dict[int, int]:
    """Convierte un token compartido en cantidades validadas por presentación.

    El token es de solo lectura y no se persiste. Se rechazan formatos
    desconocidos, cantidades fuera de rango y carritos vacíos o demasiado
    grandes. Las presentaciones repetidas se agrupan.
    """
    if not token or len(token) > MAX_TOKEN_LENGTH:
        raise InvalidCartToken("Token vacío o demasiado largo")

    padding = "=" * (-len(token) % 4)
    try:
        raw = base64.b64decode(token + padding, altchars=b"-_", validate=True)
    except (binascii.Error, ValueError) as exc:
        raise InvalidCartToken("Token con formato inválido") from exc

    if not raw or len(raw) > MAX_DECODED_BYTES:
        raise InvalidCartToken("Token vacío o demasiado largo")

    try:
        data = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise InvalidCartToken("Token con contenido inválido") from exc

    if not isinstance(data, list) or not data:
        raise InvalidCartToken("El carrito compartido está vacío")
    if len(data) > MAX_CART_ITEMS:
        raise InvalidCartToken("El carrito compartido tiene demasiadas líneas")

    quantities: dict[int, int] = {}
    for entry in data:
        if not isinstance(entry, list) or len(entry) != 2:
            raise InvalidCartToken("Cada línea debe tener presentación y cantidad")
        presentation_id, quantity = entry
        if type(presentation_id) is not int or type(quantity) is not int:
            raise InvalidCartToken("La presentación y la cantidad deben ser enteros")
        if presentation_id <= 0 or quantity <= 0 or quantity > MAX_QUANTITY:
            raise InvalidCartToken("Cantidad o presentación fuera de rango")
        quantities[presentation_id] = min(
            MAX_QUANTITY,
            quantities.get(presentation_id, 0) + quantity,
        )

    return quantities
