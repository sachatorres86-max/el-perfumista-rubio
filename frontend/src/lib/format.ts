import type {
  ItemType,
  MovementType,
  NoteType,
  ProductType,
  SupplyCategory,
  SupplyUnit,
} from './types'

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  contratipo: 'Contratipo',
  esencia: 'Esencia',
  perfume_arabe: 'Perfume árabe',
  body_splash: 'Body splash',
  cuidado_personal: 'Cuidado personal',
}

export const GENDER_LABELS: Record<string, string> = {
  femenino: 'Femenino',
  masculino: 'Masculino',
  unisex: 'Unisex',
}

export const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  salida: 'Salida',
  corazon: 'Corazón',
  fondo: 'Fondo',
}

export const NOTE_TYPE_DESCRIPTIONS: Record<NoteType, string> = {
  salida: 'La primera impresión',
  corazon: 'El carácter de la fragancia',
  fondo: 'La estela que permanece',
}

export const SUPPLY_CATEGORY_LABELS: Record<SupplyCategory, string> = {
  esencia: 'Esencia',
  fijador: 'Fijador',
  alcohol: 'Alcohol',
  frasco: 'Frasco',
  accesorio: 'Accesorio',
  otro: 'Otro',
}

export const SUPPLY_UNIT_LABELS: Record<SupplyUnit, string> = {
  ml: 'ml',
  unidad: 'unidad',
  gr: 'g',
}

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  entrada: 'Entrada',
  salida: 'Salida',
  ajuste: 'Ajuste',
}

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  presentacion: 'Producto terminado',
  insumo: 'Insumo',
}

const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

export function formatCOP(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return copFormatter.format(value)
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('es-CO').format(value)
}

export function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return value
  }
}

export function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0') && digits.length === 11) {
    digits = `58${digits.slice(1)}`
  }
  return digits
}

export function whatsappLink(phone: string, message: string): string {
  return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(message)}`
}

export function productTypeLabel(type: ProductType): string {
  return PRODUCT_TYPE_LABELS[type] ?? type
}

export function genderLabel(gender: string | null): string {
  if (!gender) return ''
  return GENDER_LABELS[gender] ?? gender
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
}

export function priceRange(min: number | null, max: number | null): string {
  if (min === null && max === null) return '—'
  if (min !== null && max !== null && min !== max) {
    return `${formatCOP(min)} – ${formatCOP(max)}`
  }
  return formatCOP(min ?? max)
}
