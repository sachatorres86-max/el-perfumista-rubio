import type { CartItem, CartLineStatus } from './types'

export const MAX_SHARED_CART_ITEMS = 100
export const MAX_SHARED_QUANTITY = 99

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

/**
 * Serializa el carrito local en un token base64url de solo lectura.
 * Devuelve `null` si las líneas no se pueden compartir de forma segura.
 */
export function encodeCartToken(items: CartItem[]): string | null {
  if (items.length === 0 || items.length > MAX_SHARED_CART_ITEMS) return null

  const pairs: [number, number][] = []
  for (const item of items) {
    const presentationId = item.presentationId
    const quantity = item.quantity
    if (
      !Number.isSafeInteger(presentationId) ||
      !Number.isSafeInteger(quantity) ||
      presentationId <= 0 ||
      quantity <= 0
    ) {
      return null
    }
    pairs.push([presentationId, Math.min(quantity, MAX_SHARED_QUANTITY)])
  }

  try {
    return btoa(JSON.stringify(pairs))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  } catch {
    return null
  }
}

export function cartShareUrl(token: string): string {
  return `${window.location.origin}/cotizacion/${token}`
}
