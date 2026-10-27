from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.constants import DEFAULT_SETTINGS
from app.core.security import hash_password
from app.core.utils import slugify
from app.models import (
    InventoryMovement,
    ItemType,
    MovementType,
    Note,
    NoteType,
    OlfactoryFamily,
    Presentation,
    Product,
    ProductImage,
    ProductNote,
    ProductType,
    Role,
    Setting,
    Supply,
    SupplyCategory,
    SupplyUnit,
    User,
)

FAMILIES = [
    ("Ámbar floral", "Cálida, resinosa y envolvente."),
    ("Aromática", "Hierbas, lavanda y especias frescas."),
    ("Gourmand", "Vainilla, praliné y notas dulces."),
    ("Amaderada", "Cedro, sándalo y vetiver."),
    ("Floral", "Ramos, pétalos y notas femeninas."),
    ("Acuática", "Fresca, marina y luminosa."),
    ("Cítrica", "Fresca, chispeante y energizante."),
    ("Frutal", "Dulce, jugosa y juvenil."),
]

NOTES = [
    "Azafrán",
    "Jazmín",
    "Ámbar gris",
    "Resina de abeto",
    "Cedro",
    "Almizcle",
    "Bergamota",
    "Pimienta",
    "Lavanda",
    "Ambroxan",
    "Vetiver",
    "Iris",
    "Praliné",
    "Vainilla",
    "Pachulí",
    "Haba tonka",
    "Almendra",
    "Café",
    "Nardo",
    "Cacao",
    "Menta",
    "Mandarina",
    "Canela",
    "Rosa damascena",
    "Cuero",
    "Dátil",
    "Benjuí",
    "Orquídea",
    "Heliotropo",
    "Frutas rojas",
    "Musgo",
    "Piña",
    "Bayas negras",
    "Geranio",
    "Peonía",
    "Magnolia",
    "Sándalo",
    "Azahar",
    "Romero",
    "Salvia",
    "Cereza",
    "Té verde",
    "Oud",
    "Notas marinas",
    "Pomelo",
    "Laurel",
    "Madera de guayaco",
]

PRODUCTS = [
    {
        "sku": "PRD-0001",
        "name": "Baccarat Rouge 540",
        "type": ProductType.contratipo,
        "family": "Ámbar floral",
        "concentration": "Extrait de parfum",
        "gender": "unisex",
        "short": "Azafrán, ámbar gris y cedro en una estela luminosa.",
        "description": (
            "Una interpretación intensa y elegante del clásico Baccarat Rouge 540. "
            "Abre con azafrán y jazmín, evoluciona hacia un corazón de ámbar gris y "
            "resina de abeto, y cierra con cedro y almizcle. Ideal para ocasiones especiales."
        ),
        "notes": {
            "salida": ["Azafrán", "Jazmín"],
            "corazon": ["Ámbar gris", "Resina de abeto"],
            "fondo": ["Cedro", "Almizcle"],
        },
        "presentations": [(30, "Vidrio con válvula", 45000, 18, 5), (50, "Vidrio con válvula", 65000, 12, 4), (100, "Vidrio con válvula", 95000, 6, 3)],
        "featured": True,
    },
    {
        "sku": "PRD-0002",
        "name": "Sauvage",
        "type": ProductType.contratipo,
        "family": "Aromática",
        "concentration": "Eau de parfum",
        "gender": "masculino",
        "short": "Bergamota, lavanda y ambroxan con un fondo de cedro.",
        "description": (
            "Frescura aromática con carácter. La bergamota y la pimienta dan paso a "
            "lavanda y ambroxan, sobre una base de cedro y vetiver. Una fragancia versátil "
            "para el día a día."
        ),
        "notes": {
            "salida": ["Bergamota", "Pimienta"],
            "corazon": ["Lavanda", "Ambroxan"],
            "fondo": ["Cedro", "Vetiver"],
        },
        "presentations": [(30, "Vidrio con válvula", 38000, 25, 5), (50, "Vidrio con válvula", 55000, 15, 4), (100, "Vidrio con válvula", 78000, 0, 3)],
        "featured": True,
    },
    {
        "sku": "PRD-0003",
        "name": "La Vie Est Belle",
        "type": ProductType.contratipo,
        "family": "Gourmand",
        "concentration": "Eau de parfum",
        "gender": "femenino",
        "short": "Iris, praliné y vainilla para una estela dulce y sofisticada.",
        "description": (
            "Un gourmand floral reconocible y femenino. El iris y el praliné se encuentran "
            "con la vainilla y el pachulí, mientras el haba tonka y el almizcle redondean "
            "la composición."
        ),
        "notes": {
            "salida": ["Iris", "Praliné"],
            "corazon": ["Vainilla", "Pachulí"],
            "fondo": ["Haba tonka", "Almizcle"],
        },
        "presentations": [(30, "Vidrio con válvula", 40000, 10, 4), (50, "Vidrio con válvula", 58000, 8, 4), (100, "Vidrio con válvula", 82000, 3, 3)],
        "featured": True,
    },
    {
        "sku": "PRD-0004",
        "name": "Good Girl",
        "type": ProductType.contratipo,
        "family": "Ámbar floral",
        "concentration": "Eau de parfum",
        "gender": "femenino",
        "short": "Almendra, café y nardo con un fondo cálido de cacao.",
        "description": (
            "Contraste entre lo dulce y lo amaderado. La almendra y el café abren con "
            "intensidad, el nardo y el jazmín aportan luminosidad, y el cacao cierra con "
            "una calidez envolvente."
        ),
        "notes": {
            "salida": ["Almendra", "Café"],
            "corazon": ["Nardo", "Jazmín"],
            "fondo": ["Haba tonka", "Cacao"],
        },
        "presentations": [(30, "Vidrio con válvula", 42000, 14, 4), (50, "Vidrio con válvula", 62000, 7, 3)],
        "featured": False,
    },
    {
        "sku": "PRD-0005",
        "name": "One Million",
        "type": ProductType.contratipo,
        "family": "Amaderada",
        "concentration": "Eau de toilette",
        "gender": "masculino",
        "short": "Menta, canela y cuero en una firma masculina inconfundible.",
        "description": (
            "Una fragancia especiada y segura. La menta y la mandarina refrescan la "
            "salida, la canela y la rosa aportan carácter, y el cuero con el ámbar gris "
            "construyen un fondo duradero."
        ),
        "notes": {
            "salida": ["Menta", "Mandarina"],
            "corazon": ["Canela", "Rosa damascena"],
            "fondo": ["Cuero", "Ámbar gris"],
        },
        "presentations": [(30, "Vidrio con válvula", 36000, 20, 5), (50, "Vidrio con válvula", 52000, 10, 4), (100, "Vidrio con válvula", 74000, 4, 3)],
        "featured": False,
    },
    {
        "sku": "PRD-0006",
        "name": "Khamrah",
        "type": ProductType.contratipo,
        "family": "Gourmand",
        "concentration": "Eau de parfum",
        "gender": "unisex",
        "short": "Dátil, canela y vainilla con un toque de praliné.",
        "description": (
            "Inspirado en la perfumería árabe contemporánea. El dátil y la canela abren "
            "un recorrido cálido que se vuelve cremoso con el praliné y el nardo, y "
            "termina en vainilla y benjuí."
        ),
        "notes": {
            "salida": ["Canela", "Dátil"],
            "corazon": ["Praliné", "Nardo"],
            "fondo": ["Vainilla", "Benjuí"],
        },
        "presentations": [(50, "Vidrio con válvula", 68000, 9, 3), (100, "Vidrio con válvula", 98000, 2, 2)],
        "featured": True,
    },
    {
        "sku": "PRD-0007",
        "name": "Yara",
        "type": ProductType.contratipo,
        "family": "Gourmand",
        "concentration": "Eau de parfum",
        "gender": "femenino",
        "short": "Orquídea, vainilla y frutas rojas en una estela dulce.",
        "description": (
            "Dulce, cremoso y juvenil. La orquídea y el heliotropo se mezclan con "
            "vainilla y frutas rojas, sobre un fondo de musgo y almizcle que aporta "
            "suavidad."
        ),
        "notes": {
            "salida": ["Orquídea", "Heliotropo"],
            "corazon": ["Vainilla", "Frutas rojas"],
            "fondo": ["Musgo", "Almizcle"],
        },
        "presentations": [(30, "Vidrio con válvula", 39000, 16, 5), (50, "Vidrio con válvula", 56000, 9, 4), (100, "Vidrio con válvula", 79000, 5, 3)],
        "featured": True,
    },
    {
        "sku": "PRD-0008",
        "name": "Asad",
        "type": ProductType.contratipo,
        "family": "Amaderada",
        "concentration": "Eau de parfum",
        "gender": "masculino",
        "short": "Piña, bayas negras y cedro con un fondo de vainilla y ámbar.",
        "description": (
            "Una fragancia frutal y amaderada con mucha presencia. La piña y las bayas "
            "negras abren con energía, el cedro y el pachulí dan estructura, y la vainilla "
            "con el ámbar gris suavizan el conjunto."
        ),
        "notes": {
            "salida": ["Piña", "Bayas negras"],
            "corazon": ["Cedro", "Pachulí"],
            "fondo": ["Vainilla", "Ámbar gris"],
        },
        "presentations": [(50, "Vidrio con válvula", 60000, 11, 3), (100, "Vidrio con válvula", 88000, 4, 2)],
        "featured": False,
    },
    {
        "sku": "PRD-0009",
        "name": "Rosa Damascena",
        "type": ProductType.esencia,
        "family": "Floral",
        "concentration": "Esencia concentrada",
        "gender": "femenino",
        "short": "Rosa damascena, geranio y un fondo de musgo y almizcle.",
        "description": (
            "Esencia floral clásica para crear tu propia fragancia o disfrutarla sola. "
            "La rosa damascena y el geranio se acompañan de peonía y magnolia, con un "
            "fondo de musgo y almizcle."
        ),
        "notes": {
            "salida": ["Rosa damascena", "Geranio"],
            "corazon": ["Peonía", "Magnolia"],
            "fondo": ["Musgo", "Almizcle"],
        },
        "presentations": [(10, "Frasco ámbar", 18000, 30, 8), (30, "Frasco ámbar", 32000, 22, 6), (50, "Frasco ámbar", 48000, 12, 4)],
        "featured": False,
    },
    {
        "sku": "PRD-0010",
        "name": "Vainilla Premium",
        "type": ProductType.esencia,
        "family": "Gourmand",
        "concentration": "Esencia concentrada",
        "gender": "unisex",
        "short": "Vainilla, benjuí y haba tonka para un fondo cálido y dulce.",
        "description": (
            "Una esencia golosa y versátil. La vainilla y el benjuí se combinan con haba "
            "tonka y praliné, sobre un fondo de almizcle y sándalo. Perfecta para combinar "
            "con notas florales o amaderadas."
        ),
        "notes": {
            "salida": ["Vainilla", "Benjuí"],
            "corazon": ["Haba tonka", "Praliné"],
            "fondo": ["Almizcle", "Sándalo"],
        },
        "presentations": [(10, "Frasco ámbar", 16000, 40, 10), (30, "Frasco ámbar", 30000, 28, 8), (50, "Frasco ámbar", 45000, 14, 5)],
        "featured": False,
    },
    {
        "sku": "PRD-0011",
        "name": "Jazmín Nocturno",
        "type": ProductType.esencia,
        "family": "Floral",
        "concentration": "Esencia concentrada",
        "gender": "femenino",
        "short": "Jazmín, azahar y magnolia con un fondo de musgo.",
        "description": (
            "La elegancia del jazmín en una esencia luminosa y envolvente. El nardo y el "
            "azahar realzan su carácter floral, mientras el musgo y el almizcle aportan "
            "permanencia."
        ),
        "notes": {
            "salida": ["Jazmín", "Nardo"],
            "corazon": ["Azahar", "Magnolia"],
            "fondo": ["Musgo", "Almizcle"],
        },
        "presentations": [(10, "Frasco ámbar", 17000, 26, 8), (30, "Frasco ámbar", 31000, 15, 5)],
        "featured": False,
    },
    {
        "sku": "PRD-0012",
        "name": "Lavanda Francesa",
        "type": ProductType.esencia,
        "family": "Aromática",
        "concentration": "Esencia concentrada",
        "gender": "unisex",
        "short": "Lavanda, romero y vetiver en una composición fresca.",
        "description": (
            "Aromática y relajante. La lavanda y la bergamota abren el camino al romero y "
            "la salvia, con un fondo de vetiver y almizcle que deja una sensación limpia."
        ),
        "notes": {
            "salida": ["Lavanda", "Bergamota"],
            "corazon": ["Romero", "Salvia"],
            "fondo": ["Vetiver", "Almizcle"],
        },
        "presentations": [(10, "Frasco ámbar", 15000, 35, 10), (30, "Frasco ámbar", 28000, 20, 6), (50, "Frasco ámbar", 42000, 10, 4)],
        "featured": False,
    },
    {
        "sku": "PRD-0013",
        "name": "Body Splash Flor de Cerezo",
        "type": ProductType.body_splash,
        "family": "Floral",
        "concentration": "Body splash",
        "gender": "femenino",
        "short": "Cereza, peonía y almizcle para el día a día.",
        "description": (
            "Frescura floral para después del baño. La cereza y la mandarina aportan un "
            "toque frutal, mientras la peonía, el jazmín y el almizcle dejan la piel "
            "suavemente perfumada."
        ),
        "notes": {
            "salida": ["Cereza", "Mandarina"],
            "corazon": ["Peonía", "Jazmín"],
            "fondo": ["Almizcle", "Sándalo"],
        },
        "presentations": [(250, "Frasco con válvula", 35000, 20, 6)],
        "featured": False,
    },
    {
        "sku": "PRD-0014",
        "name": "Oud Mood",
        "type": ProductType.perfume_arabe,
        "family": "Amaderada",
        "concentration": "Eau de parfum",
        "gender": "unisex",
        "short": "Oud, azafrán y rosa sobre una base de ámbar y sándalo.",
        "description": (
            "Un perfume árabe profundo y envolvente. El oud y el azafrán abren con fuerza, "
            "la rosa y el pachulí aportan complejidad, y el ámbar gris con el sándalo "
            "cierran una estela duradera."
        ),
        "notes": {
            "salida": ["Oud", "Azafrán"],
            "corazon": ["Rosa damascena", "Pachulí"],
            "fondo": ["Ámbar gris", "Sándalo"],
        },
        "presentations": [(50, "Vidrio con válvula", 85000, 7, 3), (100, "Vidrio con válvula", 120000, 3, 2)],
        "featured": True,
    },
    {
        "sku": "PRD-0015",
        "name": "Invictus",
        "type": ProductType.contratipo,
        "family": "Acuática",
        "concentration": "Eau de toilette",
        "gender": "masculino",
        "short": "Notas marinas, pomelo y maderas para un hombre activo.",
        "description": (
            "Una fragancia fresca y deportiva. Las notas marinas y el pomelo abren con "
            "energía, el laurel y el jazmín dan un toque aromático, y el ámbar gris con la "
            "madera de guayaco cierran el conjunto."
        ),
        "notes": {
            "salida": ["Notas marinas", "Pomelo"],
            "corazon": ["Laurel", "Jazmín"],
            "fondo": ["Ámbar gris", "Madera de guayaco"],
        },
        "presentations": [(50, "Vidrio con válvula", 54000, 0, 3), (100, "Vidrio con válvula", 76000, 0, 2)],
        "featured": False,
    },
    {
        "sku": "PRD-0016",
        "name": "Citrus Fresh",
        "type": ProductType.body_splash,
        "family": "Cítrica",
        "concentration": "Body splash",
        "gender": "unisex",
        "short": "Limón, mandarina y té verde en una bruma fresca.",
        "description": (
            "Una bruma cítrica para renovar la energía durante el día. El limón y la "
            "mandarina se mezclan con té verde y un fondo limpio de almizcle."
        ),
        "notes": {
            "salida": ["Mandarina", "Bergamota"],
            "corazon": ["Té verde", "Romero"],
            "fondo": ["Almizcle", "Cedro"],
        },
        "presentations": [(250, "Frasco con válvula", 32000, 22, 6)],
        "featured": False,
    },
    {
        "sku": "PRD-0017",
        "name": "Frutal Bloom",
        "type": ProductType.body_splash,
        "family": "Frutal",
        "concentration": "Body splash",
        "gender": "femenino",
        "short": "Frutas rojas, peonía y vainilla en una estela juvenil.",
        "description": (
            "Dulce y luminosa. Las frutas rojas y la mandarina abren con alegría, la "
            "peonía y el jazmín aportan feminidad, y la vainilla con el almizcle dejan un "
            "recuerdo suave."
        ),
        "notes": {
            "salida": ["Frutas rojas", "Mandarina"],
            "corazon": ["Peonía", "Jazmín"],
            "fondo": ["Vainilla", "Almizcle"],
        },
        "presentations": [(250, "Frasco con válvula", 33000, 16, 5)],
        "featured": False,
    },
]

SUPPLIES = [
    ("INS-0001", "Esencia Baccarat 540", SupplyCategory.esencia, SupplyUnit.ml, 850, 200, 1200),
    ("INS-0002", "Esencia Sauvage", SupplyCategory.esencia, SupplyUnit.ml, 620, 200, 900),
    ("INS-0003", "Esencia Vainilla", SupplyCategory.esencia, SupplyUnit.ml, 1200, 300, 700),
    ("INS-0004", "Esencia Rosa Damascena", SupplyCategory.esencia, SupplyUnit.ml, 300, 150, 1500),
    ("INS-0005", "Esencia Oud", SupplyCategory.esencia, SupplyUnit.ml, 180, 100, 2200),
    ("INS-0006", "Esencia Lavanda", SupplyCategory.esencia, SupplyUnit.ml, 400, 150, 650),
    ("INS-0007", "Esencia Jazmín", SupplyCategory.esencia, SupplyUnit.ml, 260, 120, 1400),
    ("INS-0008", "Fijador concentrado", SupplyCategory.fijador, SupplyUnit.ml, 2000, 500, 450),
    ("INS-0009", "Alcohol perfumístico 96°", SupplyCategory.alcohol, SupplyUnit.ml, 5000, 1000, 180),
    ("INS-0010", "Frasco vidrio 30 ml", SupplyCategory.frasco, SupplyUnit.unidad, 80, 20, 900),
    ("INS-0011", "Frasco vidrio 50 ml", SupplyCategory.frasco, SupplyUnit.unidad, 45, 20, 1200),
    ("INS-0012", "Frasco vidrio 100 ml", SupplyCategory.frasco, SupplyUnit.unidad, 12, 20, 1800),
    ("INS-0013", "Válvula spray 15 mm", SupplyCategory.accesorio, SupplyUnit.unidad, 150, 50, 350),
    ("INS-0014", "Caja de presentación", SupplyCategory.accesorio, SupplyUnit.unidad, 60, 25, 600),
    ("INS-0015", "Etiquetas adhesivas", SupplyCategory.accesorio, SupplyUnit.unidad, 200, 50, 80),
]


def _ensure_settings(db: Session) -> None:
    for key, value in DEFAULT_SETTINGS.items():
        if not db.get(Setting, key):
            db.add(Setting(key=key, value=value))


def _ensure_users(db: Session) -> None:
    if not db.scalar(select(User.id).where(User.email == settings.admin_email.lower())):
        db.add(
            User(
                name=settings.admin_name,
                email=settings.admin_email.lower(),
                password_hash=hash_password(settings.admin_password),
                role=Role.admin,
            )
        )
    if not db.scalar(select(User.id).where(User.email == "vendedor@elperfumistarubio.com")):
        db.add(
            User(
                name="Vendedor",
                email="vendedor@elperfumistarubio.com",
                password_hash=hash_password(settings.seller_password),
                role=Role.vendedor,
            )
        )
    db.flush()


def _ensure_catalog(db: Session) -> bool:
    if (db.scalar(select(func.count(Product.id))) or 0) > 0:
        return False

    family_map: dict[str, OlfactoryFamily] = {}
    for index, (name, description) in enumerate(FAMILIES):
        family = OlfactoryFamily(
            name=name,
            slug=slugify(name),
            description=description,
            sort_order=index,
        )
        db.add(family)
        family_map[name] = family

    note_map: dict[str, Note] = {}
    for name in NOTES:
        note = Note(name=name, slug=slugify(name))
        db.add(note)
        note_map[name] = note

    db.flush()

    admin = db.scalar(select(User).where(User.role == Role.admin))
    assert admin is not None

    created: list[Product] = []
    for item in PRODUCTS:
        slug = slugify(item["name"])
        product = Product(
            sku=item["sku"],
            name=item["name"],
            slug=slug,
            brand="El Perfumista Rubio",
            product_type=item["type"],
            family_id=family_map[item["family"]].id,
            concentration=item["concentration"],
            gender=item["gender"],
            short_description=item["short"],
            description=item["description"],
            active=True,
            featured=item.get("featured", False),
        )
        db.add(product)
        db.flush()

        for note_type, names in item["notes"].items():
            for note_name in names:
                db.add(
                    ProductNote(
                        product_id=product.id,
                        note_id=note_map[note_name].id,
                        note_type=NoteType(note_type),
                    )
                )

        for volume, bottle, price, stock, min_stock in item["presentations"]:
            presentation = Presentation(
                product_id=product.id,
                volume_ml=volume,
                bottle_type=bottle,
                price_cop=price,
                stock=stock,
                min_stock=min_stock,
                active=True,
            )
            db.add(presentation)
            db.flush()
            if stock > 0:
                db.add(
                    InventoryMovement(
                        item_type=ItemType.presentacion,
                        presentation_id=presentation.id,
                        movement_type=MovementType.entrada,
                        quantity=stock,
                        resulting_stock=stock,
                        reason="Stock inicial",
                        user_id=admin.id,
                    )
                )

        db.add(
            ProductImage(
                product_id=product.id,
                path=f"/media/products/{slug}.webp",
                alt=item["name"],
                sort_order=0,
            )
        )
        created.append(product)

    # Un par de salidas para que el historial y el stock bajo tengan movimiento real.
    def sample_exit(product_name: str, volume: int, quantity: int, reason: str) -> None:
        presentation = db.scalar(
            select(Presentation)
            .join(Product)
            .where(Product.name == product_name, Presentation.volume_ml == volume)
        )
        if not presentation or presentation.stock < quantity:
            return
        presentation.stock -= quantity
        db.add(
            InventoryMovement(
                item_type=ItemType.presentacion,
                presentation_id=presentation.id,
                movement_type=MovementType.salida,
                quantity=quantity,
                resulting_stock=presentation.stock,
                reason=reason,
                user_id=admin.id,
            )
        )

    sample_exit("Baccarat Rouge 540", 30, 2, "Venta en mostrador")
    sample_exit("Sauvage", 50, 3, "Venta en mostrador")
    sample_exit("La Vie Est Belle", 50, 2, "Venta en mostrador")

    return True


def _ensure_supplies(db: Session) -> bool:
    if (db.scalar(select(func.count(Supply.id))) or 0) > 0:
        return False

    admin = db.scalar(select(User).where(User.role == Role.admin))
    assert admin is not None

    for sku, name, category, unit, stock, min_stock, cost in SUPPLIES:
        supply = Supply(
            sku=sku,
            name=name,
            category=category,
            unit=unit,
            stock=stock,
            min_stock=min_stock,
            unit_cost_cop=cost,
            active=True,
        )
        db.add(supply)
        db.flush()
        if stock > 0:
            db.add(
                InventoryMovement(
                    item_type=ItemType.insumo,
                    supply_id=supply.id,
                    movement_type=MovementType.entrada,
                    quantity=stock,
                    resulting_stock=stock,
                    reason="Stock inicial",
                    user_id=admin.id,
                )
            )

    def sample_exit(sku: str, quantity: int, reason: str) -> None:
        supply = db.scalar(select(Supply).where(Supply.sku == sku))
        if not supply or supply.stock < quantity:
            return
        supply.stock -= quantity
        db.add(
            InventoryMovement(
                item_type=ItemType.insumo,
                supply_id=supply.id,
                movement_type=MovementType.salida,
                quantity=quantity,
                resulting_stock=supply.stock,
                reason=reason,
                user_id=admin.id,
            )
        )

    sample_exit("INS-0001", 120, "Preparación de pedido")
    sample_exit("INS-0008", 80, "Preparación de pedido")
    sample_exit("INS-0009", 300, "Preparación de pedido")
    sample_exit("INS-0010", 4, "Preparación de pedido")

    return True


def seed_all(db: Session) -> None:
    _ensure_settings(db)
    _ensure_users(db)
    _ensure_catalog(db)
    _ensure_supplies(db)
    db.commit()
