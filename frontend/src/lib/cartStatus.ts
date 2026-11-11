import type { CartLineStatus } from './types'

export const CART_STATUS_LABEL: Record<CartLineStatus, string> = {
  disponible: 'Disponible',
  insuficiente: 'Cantidad no disponible',
  no_disponible: 'Agotado',
}

export const CART_STATUS_TONE: Record<
  CartLineStatus,
  'success' | 'warning' | 'neutral'
> = {
  disponible: 'success',
  insuficiente: 'warning',
  no_disponible: 'neutral',
}
