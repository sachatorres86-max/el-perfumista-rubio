export type Role = 'admin' | 'vendedor'

export type ProductType =
  | 'contratipo'
  | 'esencia'
  | 'perfume_arabe'
  | 'body_splash'
  | 'cuidado_personal'

export type NoteType = 'salida' | 'corazon' | 'fondo'

export type SupplyCategory =
  | 'esencia'
  | 'fijador'
  | 'alcohol'
  | 'frasco'
  | 'accesorio'
  | 'otro'

export type SupplyUnit = 'ml' | 'unidad' | 'gr'

export type MovementType = 'entrada' | 'salida' | 'ajuste'

export type ItemType = 'presentacion' | 'insumo'

export interface Family {
  id: number
  name: string
  slug: string
  description: string | null
  product_count: number
}

export interface Note {
  id: number
  name: string
  slug: string
  usage_count?: number
}

export interface PresentationPublic {
  id: number
  volume_ml: number
  bottle_type: string | null
  available: boolean
}

export interface ProductListItem {
  id: number
  slug: string
  name: string
  brand: string | null
  product_type: ProductType
  concentration: string | null
  gender: string | null
  short_description: string | null
  family: Family | null
  image_url: string | null
  available: boolean
  available_volumes: number[]
  featured: boolean
}

export interface ProductDetail extends ProductListItem {
  description: string | null
  notes: Record<NoteType, Note[]>
  images: string[]
  presentations: PresentationPublic[]
  related: ProductListItem[]
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pages: number
  page_size: number
}

export interface PublicConfig {
  business_name: string
  whatsapp_primary: string
  whatsapp_secondary: string
  hours: string
  instagram_url: string
  location_1: string
  location_2: string
  hero_title: string
  hero_subtitle: string
  about_text: string
}

export interface User {
  id: number
  name: string
  email: string
  role: Role
}

export interface PresentationAdmin {
  id: number
  volume_ml: number
  bottle_type: string | null
  price_cop: number
  stock: number
  min_stock: number
  active: boolean
}

export interface ImageAdmin {
  id: number
  path: string
  alt: string | null
  sort_order: number
}

export interface NoteLinkAdmin {
  note_id: number
  note_type: NoteType
  name: string
}

export interface ProductAdmin {
  id: number
  sku: string
  name: string
  slug: string
  brand: string | null
  product_type: ProductType
  family_id: number | null
  family: Family | null
  concentration: string | null
  gender: string | null
  short_description: string | null
  description: string | null
  active: boolean
  featured: boolean
  created_at: string
  notes: NoteLinkAdmin[]
  presentations: PresentationAdmin[]
  images: ImageAdmin[]
  total_stock: number
  price_min: number | null
  price_max: number | null
  image_url: string | null
}

export interface ProductAdminListItem {
  id: number
  sku: string
  name: string
  slug: string
  brand: string | null
  product_type: ProductType
  family_name: string | null
  active: boolean
  featured: boolean
  total_stock: number
  presentation_count: number
  price_min: number | null
  price_max: number | null
  image_url: string | null
  available: boolean
}

export interface Supply {
  id: number
  sku: string
  name: string
  category: SupplyCategory
  unit: SupplyUnit
  stock: number
  min_stock: number
  unit_cost_cop: number
  active: boolean
  notes: string | null
  low_stock: boolean
}

export interface Movement {
  id: number
  item_type: ItemType
  item_label: string
  presentation_id: number | null
  supply_id: number | null
  movement_type: MovementType
  quantity: number
  resulting_stock: number
  reason: string | null
  user_name: string | null
  created_at: string
}

export interface PresentationOption {
  id: number
  label: string
  stock: number
  product_name: string
  volume_ml: number
}

export interface ReportSummary {
  low_stock_presentations: Array<{
    presentation_id: number
    product_id: number
    product_name: string
    sku: string
    volume_ml: number
    stock: number
    min_stock: number
    price_cop: number
  }>
  out_of_stock_presentations: Array<{
    presentation_id: number
    product_id: number
    product_name: string
    sku: string
    volume_ml: number
    min_stock: number
  }>
  low_stock_supplies: Array<{
    supply_id: number
    name: string
    sku: string
    unit: string
    stock: number
    min_stock: number
  }>
  inventory_value_cop: number
  product_value_cop: number
  supply_value_cop: number
  counts: {
    low_stock_presentations: number
    out_of_stock_presentations: number
    low_stock_supplies: number
  }
}

export interface Dashboard {
  products_total: number
  products_active: number
  presentations_count: number
  supplies_count: number
  out_of_stock_products: number
  low_stock_presentations: number
  low_stock_supplies: number
  inventory_value_cop: number
  product_value_cop: number
  supply_value_cop: number
  families: Array<{ name: string; count: number }>
  recent_movements: Movement[]
}

export interface ProductInput {
  sku?: string
  name: string
  brand?: string | null
  product_type: ProductType
  family_id: number | null
  concentration?: string | null
  gender?: string | null
  short_description?: string | null
  description?: string | null
  active: boolean
  featured: boolean
  notes: Array<{ note_id: number; note_type: NoteType }>
  presentations: Array<{
    id?: number
    volume_ml: number
    bottle_type?: string | null
    price_cop: number
    stock: number
    min_stock: number
    active: boolean
  }>
}

export interface SupplyInput {
  sku?: string
  name: string
  category: SupplyCategory
  unit: SupplyUnit
  stock?: number
  min_stock: number
  unit_cost_cop: number
  active: boolean
  notes?: string | null
}

export interface MovementInput {
  item_type: ItemType
  presentation_id?: number | null
  supply_id?: number | null
  movement_type: MovementType
  quantity: number
  reason?: string | null
}

export interface FamilyInput {
  name: string
  description?: string | null
  sort_order: number
}

export interface NoteInput {
  name: string
}
