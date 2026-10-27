"""Genera imágenes de demostración y los iconos de la PWA a partir del logo."""

from __future__ import annotations

import random
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.seed import PRODUCTS

ROOT = Path(__file__).resolve().parents[1]
MEDIA_DIR = ROOT / "media" / "products"
PUBLIC_DIR = ROOT.parent / "frontend" / "public"

WIDTH, HEIGHT = 900, 1125

PALETTES = {
    "Ámbar floral": ("#1a0b2e", "#7c3aed", "#f0abfc"),
    "Aromática": ("#061a1f", "#0891b2", "#67e8f9"),
    "Gourmand": ("#1f0716", "#be185d", "#fbcfe8"),
    "Amaderada": ("#1a0f06", "#b45309", "#fcd34d"),
    "Floral": ("#1c0713", "#9d174d", "#f9a8d4"),
    "Acuática": ("#04161c", "#0e7490", "#a5f3fc"),
    "Cítrica": ("#1a1404", "#ca8a04", "#fef08a"),
    "Frutal": ("#1f060b", "#be123c", "#fda4af"),
}

FONT_BOLD = Path("C:/Windows/Fonts/georgiab.ttf")
FONT_REGULAR = Path("C:/Windows/Fonts/arial.ttf")


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    if path.is_file():
        return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def hex_rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[index : index + 2], 16) for index in (0, 2, 4))


def blend(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(round(a[index] + (b[index] - a[index]) * t) for index in range(3))


def gradient(size: tuple[int, int], top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    width, height = size
    image = Image.new("RGB", size)
    draw = ImageDraw.Draw(image)
    for y in range(height):
        draw.line([(0, y), (width, y)], fill=blend(top, bottom, y / height))
    return image


def draw_bottle(overlay: Image.Image, accent: tuple[int, int, int]) -> None:
    draw = ImageDraw.Draw(overlay)

    # Halo detrás del frasco
    draw.ellipse([210, 300, 690, 900], fill=(*accent, 42))

    # Cuerpo del frasco
    draw.rounded_rectangle(
        [285, 455, 615, 900],
        radius=48,
        fill=(255, 255, 255, 20),
        outline=(255, 255, 255, 95),
        width=2,
    )
    # Líquido
    draw.rounded_rectangle(
        [300, 610, 600, 885],
        radius=38,
        fill=(*accent, 70),
    )
    # Reflejo lateral
    draw.rounded_rectangle([310, 480, 340, 860], radius=14, fill=(255, 255, 255, 26))

    # Cuello
    draw.rectangle([410, 395, 490, 470], fill=(255, 255, 255, 24))
    draw.rectangle([418, 400, 482, 465], fill=(*accent, 55))

    # Tapa
    draw.rounded_rectangle(
        [392, 300, 508, 402],
        radius=14,
        fill=(9, 9, 12, 230),
        outline=(255, 255, 255, 120),
        width=2,
    )
    draw.rounded_rectangle([410, 318, 490, 330], radius=5, fill=(255, 255, 255, 70))

    # Válvula
    draw.rectangle([438, 282, 462, 304], fill=(230, 230, 235, 220))
    draw.rectangle([420, 272, 480, 284], fill=(230, 230, 235, 220))

    # Etiqueta
    draw.rounded_rectangle([345, 700, 555, 800], radius=8, fill=(8, 8, 12, 70))
    draw.rounded_rectangle(
        [345, 700, 555, 800],
        radius=8,
        outline=(255, 255, 255, 70),
        width=1,
    )


def draw_smoke(overlay: Image.Image, colors: list[tuple[int, int, int]]) -> None:
    draw = ImageDraw.Draw(overlay)
    random.seed(42)
    for _ in range(9):
        cx = random.randint(80, WIDTH - 80)
        cy = random.randint(80, HEIGHT - 80)
        radius = random.randint(90, 240)
        color = random.choice(colors)
        draw.ellipse(
            [cx - radius, cy - radius, cx + radius, cy + radius],
            fill=(*color, random.randint(18, 42)),
        )


def fit_text(draw: ImageDraw.ImageDraw, text: str, max_width: int, start_size: int, path: Path) -> ImageFont.FreeTypeFont:
    size = start_size
    while size > 18:
        candidate = font(path, size)
        box = draw.textbbox((0, 0), text, font=candidate)
        if box[2] - box[0] <= max_width:
            return candidate
        size -= 2
    return font(path, 18)


def centered_text(draw: ImageDraw.ImageDraw, y: int, text: str, text_font, fill) -> None:
    box = draw.textbbox((0, 0), text, font=text_font)
    x = (WIDTH - (box[2] - box[0])) / 2
    draw.text((x, y), text, font=text_font, fill=fill)


def make_product_image(product: dict, output: Path) -> None:
    dark, mid, light = (hex_rgb(value) for value in PALETTES[product["family"]])
    image = gradient((WIDTH, HEIGHT), hex_rgb("#08080a"), dark)

    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw_smoke(overlay, [mid, light, hex_rgb("#06b6d4")])
    overlay = overlay.filter(ImageFilter.GaussianBlur(34))

    bottle_layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw_bottle(bottle_layer, mid)
    bottle_layer = bottle_layer.filter(ImageFilter.GaussianBlur(0.6))

    image = Image.alpha_composite(image.convert("RGBA"), overlay)
    image = Image.alpha_composite(image, bottle_layer)

    draw = ImageDraw.Draw(image)
    name_font = fit_text(draw, product["name"], 760, 58, FONT_BOLD)
    brand_font = font(FONT_REGULAR, 20)
    family_font = font(FONT_REGULAR, 18)
    label_small = font(FONT_REGULAR, 13)
    label_big = font(FONT_BOLD, 24)

    centered_text(draw, 716, "EL PERFUMISTA", label_small, (255, 255, 255, 190))
    centered_text(draw, 740, "RUBIO", label_big, (255, 255, 255, 225))
    centered_text(draw, 940, product["name"], name_font, (255, 255, 255, 235))
    centered_text(draw, 1010, "EL PERFUMISTA RUBIO", brand_font, (255, 255, 255, 150))
    centered_text(draw, 1044, product["family"].upper(), family_font, (*light, 220))

    output.parent.mkdir(parents=True, exist_ok=True)
    image.convert("RGB").save(output, "WEBP", quality=88, method=6)


def make_icons() -> None:
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    logo_path = PUBLIC_DIR / "logo.png"
    if not logo_path.is_file():
        return

    logo = Image.open(logo_path).convert("RGBA")
    side = min(logo.size)
    left = (logo.width - side) // 2
    top = (logo.height - side) // 2
    logo = logo.crop((left, top, left + side, top + side))

    for size in (192, 512):
        logo.resize((size, size), Image.LANCZOS).save(
            PUBLIC_DIR / f"pwa-{size}.png", "PNG", optimize=True
        )

    logo.resize((180, 180), Image.LANCZOS).save(
        PUBLIC_DIR / "apple-touch-icon.png", "PNG", optimize=True
    )

    favicon = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    favicon.paste(logo.resize((64, 64), Image.LANCZOS), (0, 0))
    favicon.save(PUBLIC_DIR / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])

    # Icono maskable con margen de seguridad
    canvas = Image.new("RGBA", (512, 512), (8, 8, 10, 255))
    inner = logo.resize((400, 400), Image.LANCZOS)
    canvas.paste(inner, (56, 56), inner)
    canvas.save(PUBLIC_DIR / "pwa-maskable-512.png", "PNG", optimize=True)

    # Imagen para compartir en redes
    og = gradient((1200, 630), hex_rgb("#08080a"), hex_rgb("#1b0b2e"))
    og_draw = ImageDraw.Draw(og)
    glow = Image.new("RGBA", (1200, 630), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse([-150, -180, 520, 490], fill=(6, 182, 212, 70))
    glow_draw.ellipse([760, 180, 1350, 780], fill=(124, 58, 237, 80))
    glow = glow.filter(ImageFilter.GaussianBlur(90))
    og = Image.alpha_composite(og.convert("RGBA"), glow)

    og_logo = logo.resize((300, 300), Image.LANCZOS)
    og.paste(og_logo, (90, 165), og_logo)

    og_draw = ImageDraw.Draw(og)
    title_font = font(FONT_BOLD, 64)
    subtitle_font = font(FONT_REGULAR, 26)
    small_font = font(FONT_REGULAR, 20)
    og_draw.text((450, 230), "El Perfumista", font=title_font, fill=(255, 255, 255, 245))
    og_draw.text((450, 305), "Rubio", font=title_font, fill=(255, 255, 255, 245))
    og_draw.text((454, 400), "Perfumes · Esencias · Cuidado personal", font=subtitle_font, fill=(210, 240, 245, 220))
    og_draw.text((454, 450), "Consulta disponibilidad por WhatsApp", font=small_font, fill=(180, 180, 195, 220))
    og.convert("RGB").save(PUBLIC_DIR / "og-image.jpg", "JPEG", quality=90, optimize=True)


def main() -> None:
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    for product in PRODUCTS:
        slug = product["name"].lower()
        slug = (
            slug.replace("á", "a")
            .replace("é", "e")
            .replace("í", "i")
            .replace("ó", "o")
            .replace("ú", "u")
            .replace("ñ", "n")
            .replace(" ", "-")
        )
        make_product_image(product, MEDIA_DIR / f"{slug}.webp")
    make_icons()
    print(f"Imágenes generadas en {MEDIA_DIR}")


if __name__ == "__main__":
    main()
