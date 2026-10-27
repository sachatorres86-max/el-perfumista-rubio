from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import (
    ItemType,
    MovementType,
    NoteType,
    ProductType,
    Role,
    SupplyCategory,
    SupplyUnit,
)


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------- catálogo público


class FamilyOut(ORMModel):
    id: int
    name: str
    slug: str
    description: str | None = None
    product_count: int = 0


class NoteOut(ORMModel):
    id: int
    name: str
    slug: str
    usage_count: int = 0


class PresentationPublic(BaseModel):
    id: int
    volume_ml: int
    bottle_type: str | None = None
    available: bool


class ProductListItem(BaseModel):
    id: int
    slug: str
    name: str
    brand: str | None = None
    product_type: ProductType
    concentration: str | None = None
    gender: str | None = None
    short_description: str | None = None
    family: FamilyOut | None = None
    image_url: str | None = None
    available: bool
    available_volumes: list[int] = Field(default_factory=list)
    featured: bool = False


class ProductDetail(ProductListItem):
    description: str | None = None
    notes: dict[str, list[NoteOut]] = Field(default_factory=dict)
    images: list[str] = Field(default_factory=list)
    presentations: list[PresentationPublic] = Field(default_factory=list)
    related: list[ProductListItem] = Field(default_factory=list)


class PaginatedProducts(BaseModel):
    items: list[ProductListItem]
    total: int
    page: int
    pages: int
    page_size: int


class PublicConfig(BaseModel):
    business_name: str
    whatsapp_primary: str
    whatsapp_secondary: str
    hours: str
    instagram_url: str
    location_1: str
    location_2: str
    hero_title: str
    hero_subtitle: str
    about_text: str


# ---------------------------------------------------------------- autenticación


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=4, max_length=128)


class UserOut(ORMModel):
    id: int
    name: str
    email: EmailStr
    role: Role


# ---------------------------------------------------------------- administración


class PresentationIn(BaseModel):
    id: int | None = None
    volume_ml: int = Field(gt=0, le=1000)
    bottle_type: str | None = Field(default=None, max_length=120)
    price_cop: int = Field(ge=0, le=100_000_000)
    stock: int = Field(ge=0, le=1_000_000)
    min_stock: int = Field(ge=0, le=1_000_000)
    active: bool = True


class PresentationAdminOut(BaseModel):
    id: int
    volume_ml: int
    bottle_type: str | None = None
    price_cop: int
    stock: int
    min_stock: int
    active: bool


class NoteLinkIn(BaseModel):
    note_id: int
    note_type: NoteType


class NoteLinkAdminOut(BaseModel):
    note_id: int
    note_type: NoteType
    name: str


class ProductIn(BaseModel):
    sku: str | None = Field(default=None, max_length=40)
    name: str = Field(min_length=2, max_length=160)
    slug: str | None = Field(default=None, max_length=180)
    brand: str | None = Field(default=None, max_length=120)
    product_type: ProductType
    family_id: int | None = None
    concentration: str | None = Field(default=None, max_length=80)
    gender: str | None = Field(default=None, max_length=30)
    short_description: str | None = Field(default=None, max_length=280)
    description: str | None = None
    active: bool = True
    featured: bool = False
    notes: list[NoteLinkIn] = Field(default_factory=list)
    presentations: list[PresentationIn] = Field(default_factory=list)


class ImageOut(ORMModel):
    id: int
    path: str
    alt: str | None = None
    sort_order: int = 0


class ProductAdminOut(BaseModel):
    id: int
    sku: str
    name: str
    slug: str
    brand: str | None = None
    product_type: ProductType
    family_id: int | None = None
    family: FamilyOut | None = None
    concentration: str | None = None
    gender: str | None = None
    short_description: str | None = None
    description: str | None = None
    active: bool
    featured: bool
    created_at: datetime
    notes: list[NoteLinkAdminOut] = Field(default_factory=list)
    presentations: list[PresentationAdminOut] = Field(default_factory=list)
    images: list[ImageOut] = Field(default_factory=list)
    total_stock: int = 0
    price_min: int | None = None
    price_max: int | None = None
    image_url: str | None = None


class ProductAdminListItem(BaseModel):
    id: int
    sku: str
    name: str
    slug: str
    brand: str | None = None
    product_type: ProductType
    family_name: str | None = None
    active: bool
    featured: bool
    total_stock: int
    presentation_count: int
    price_min: int | None = None
    price_max: int | None = None
    image_url: str | None = None
    available: bool


class PaginatedAdminProducts(BaseModel):
    items: list[ProductAdminListItem]
    total: int
    page: int
    pages: int
    page_size: int


class FamilyIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    slug: str | None = Field(default=None, max_length=100)
    description: str | None = None
    sort_order: int = 0


class NoteIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    slug: str | None = Field(default=None, max_length=100)


class SupplyIn(BaseModel):
    sku: str | None = Field(default=None, max_length=40)
    name: str = Field(min_length=2, max_length=160)
    category: SupplyCategory
    unit: SupplyUnit
    stock: int = Field(default=0, ge=0, le=1_000_000)
    min_stock: int = Field(default=0, ge=0, le=1_000_000)
    unit_cost_cop: int = Field(default=0, ge=0, le=100_000_000)
    active: bool = True
    notes: str | None = None


class SupplyUpdate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    category: SupplyCategory
    unit: SupplyUnit
    min_stock: int = Field(default=0, ge=0, le=1_000_000)
    unit_cost_cop: int = Field(default=0, ge=0, le=100_000_000)
    active: bool = True
    notes: str | None = None


class SupplyOut(BaseModel):
    id: int
    sku: str
    name: str
    category: SupplyCategory
    unit: SupplyUnit
    stock: int
    min_stock: int
    unit_cost_cop: int
    active: bool
    notes: str | None = None
    low_stock: bool


class MovementIn(BaseModel):
    item_type: ItemType
    presentation_id: int | None = None
    supply_id: int | None = None
    movement_type: MovementType
    quantity: int = Field(ge=0, le=1_000_000)
    reason: str | None = Field(default=None, max_length=255)


class MovementOut(BaseModel):
    id: int
    item_type: ItemType
    item_label: str
    presentation_id: int | None = None
    supply_id: int | None = None
    movement_type: MovementType
    quantity: int
    resulting_stock: int
    reason: str | None = None
    user_name: str | None = None
    created_at: datetime


class PaginatedMovements(BaseModel):
    items: list[MovementOut]
    total: int
    page: int
    pages: int
    page_size: int


class PresentationOption(BaseModel):
    id: int
    label: str
    stock: int
    product_name: str
    volume_ml: int


class SettingsIn(BaseModel):
    business_name: str | None = Field(default=None, max_length=120)
    whatsapp_primary: str | None = Field(default=None, max_length=40)
    whatsapp_secondary: str | None = Field(default=None, max_length=40)
    hours: str | None = Field(default=None, max_length=120)
    instagram_url: str | None = Field(default=None, max_length=300)
    location_1: str | None = Field(default=None, max_length=200)
    location_2: str | None = Field(default=None, max_length=200)
    hero_title: str | None = Field(default=None, max_length=160)
    hero_subtitle: str | None = Field(default=None, max_length=400)
    about_text: str | None = Field(default=None, max_length=2000)


class MessageOut(BaseModel):
    message: str
    detail: Any | None = None
