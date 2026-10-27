from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Role(str, enum.Enum):
    admin = "admin"
    vendedor = "vendedor"


class ProductType(str, enum.Enum):
    contratipo = "contratipo"
    esencia = "esencia"
    perfume_arabe = "perfume_arabe"
    body_splash = "body_splash"
    cuidado_personal = "cuidado_personal"


class NoteType(str, enum.Enum):
    salida = "salida"
    corazon = "corazon"
    fondo = "fondo"


class SupplyCategory(str, enum.Enum):
    esencia = "esencia"
    fijador = "fijador"
    alcohol = "alcohol"
    frasco = "frasco"
    accesorio = "accesorio"
    otro = "otro"


class SupplyUnit(str, enum.Enum):
    ml = "ml"
    unidad = "unidad"
    gr = "gr"


class MovementType(str, enum.Enum):
    entrada = "entrada"
    salida = "salida"
    ajuste = "ajuste"


class ItemType(str, enum.Enum):
    presentacion = "presentacion"
    insumo = "insumo"


def _enum(enum_cls: type[enum.Enum], length: int = 32) -> Enum:
    return Enum(
        enum_cls,
        native_enum=False,
        length=length,
        validate_strings=True,
        values_callable=lambda items: [item.value for item in items],
    )


class User(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(180), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(_enum(Role, 20), default=Role.vendedor)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    movements: Mapped[list[InventoryMovement]] = relationship(back_populates="user")


class OlfactoryFamily(Base):
    __tablename__ = "familias_olfativas"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    products: Mapped[list[Product]] = relationship(back_populates="family")


class Note(Base):
    __tablename__ = "notas_olfativas"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    product_links: Mapped[list[ProductNote]] = relationship(back_populates="note")


class Product(Base):
    __tablename__ = "productos"

    id: Mapped[int] = mapped_column(primary_key=True)
    sku: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(160), index=True)
    slug: Mapped[str] = mapped_column(String(180), unique=True, index=True)
    brand: Mapped[str | None] = mapped_column(String(120))
    product_type: Mapped[ProductType] = mapped_column(_enum(ProductType))
    family_id: Mapped[int | None] = mapped_column(ForeignKey("familias_olfativas.id", ondelete="SET NULL"))
    concentration: Mapped[str | None] = mapped_column(String(80))
    gender: Mapped[str | None] = mapped_column(String(30))
    short_description: Mapped[str | None] = mapped_column(String(280))
    description: Mapped[str | None] = mapped_column(Text)
    active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    featured: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    family: Mapped[OlfactoryFamily | None] = relationship(back_populates="products")
    presentations: Mapped[list[Presentation]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="Presentation.volume_ml",
    )
    images: Mapped[list[ProductImage]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="ProductImage.sort_order",
    )
    note_links: Mapped[list[ProductNote]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
    )


class ProductNote(Base):
    __tablename__ = "producto_notas"
    __table_args__ = (UniqueConstraint("product_id", "note_id", "note_type", name="uq_product_note_type"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("productos.id", ondelete="CASCADE"), index=True)
    note_id: Mapped[int] = mapped_column(ForeignKey("notas_olfativas.id", ondelete="CASCADE"), index=True)
    note_type: Mapped[NoteType] = mapped_column(_enum(NoteType, 20))

    product: Mapped[Product] = relationship(back_populates="note_links")
    note: Mapped[Note] = relationship(back_populates="product_links")


class Presentation(Base):
    __tablename__ = "presentaciones"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("productos.id", ondelete="CASCADE"), index=True)
    volume_ml: Mapped[int] = mapped_column(Integer)
    bottle_type: Mapped[str | None] = mapped_column(String(120))
    price_cop: Mapped[int] = mapped_column(Integer, default=0)
    stock: Mapped[int] = mapped_column(Integer, default=0)
    min_stock: Mapped[int] = mapped_column(Integer, default=5)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    product: Mapped[Product] = relationship(back_populates="presentations")


class ProductImage(Base):
    __tablename__ = "producto_imagenes"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("productos.id", ondelete="CASCADE"), index=True)
    path: Mapped[str] = mapped_column(String(300))
    alt: Mapped[str | None] = mapped_column(String(200))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    product: Mapped[Product] = relationship(back_populates="images")


class Supply(Base):
    __tablename__ = "insumos"

    id: Mapped[int] = mapped_column(primary_key=True)
    sku: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(160), index=True)
    category: Mapped[SupplyCategory] = mapped_column(_enum(SupplyCategory))
    unit: Mapped[SupplyUnit] = mapped_column(_enum(SupplyUnit, 20))
    stock: Mapped[int] = mapped_column(Integer, default=0)
    min_stock: Mapped[int] = mapped_column(Integer, default=0)
    unit_cost_cop: Mapped[int] = mapped_column(Integer, default=0)
    active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    movements: Mapped[list[InventoryMovement]] = relationship(back_populates="supply")


class InventoryMovement(Base):
    __tablename__ = "movimientos_inventario"

    id: Mapped[int] = mapped_column(primary_key=True)
    item_type: Mapped[ItemType] = mapped_column(_enum(ItemType, 20), index=True)
    presentation_id: Mapped[int | None] = mapped_column(
        ForeignKey("presentaciones.id", ondelete="SET NULL"), index=True
    )
    supply_id: Mapped[int | None] = mapped_column(ForeignKey("insumos.id", ondelete="SET NULL"), index=True)
    movement_type: Mapped[MovementType] = mapped_column(_enum(MovementType, 20))
    quantity: Mapped[int] = mapped_column(Integer)
    resulting_stock: Mapped[int] = mapped_column(Integer)
    reason: Mapped[str | None] = mapped_column(String(255))
    user_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

    presentation: Mapped[Presentation | None] = relationship()
    supply: Mapped[Supply | None] = relationship(back_populates="movements")
    user: Mapped[User | None] = relationship(back_populates="movements")


class Setting(Base):
    __tablename__ = "configuracion"

    key: Mapped[str] = mapped_column(String(80), primary_key=True)
    value: Mapped[str] = mapped_column(Text, default="")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
