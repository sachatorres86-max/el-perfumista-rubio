import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from './AuthContext'
import type { CartItem } from '../lib/types'

const STORAGE_PREFIX = 'perfumista_cart_v1'
const MAX_QUANTITY = 99

interface CartContextValue {
  items: CartItem[]
  ready: boolean
  canUseCart: boolean
  totalUnits: number
  addItem: (presentationId: number, quantity?: number) => boolean
  removeItem: (presentationId: number) => void
  setQuantity: (presentationId: number, quantity: number) => void
  increment: (presentationId: number) => void
  decrement: (presentationId: number) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

function parseStoredItems(raw: string | null): CartItem[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    const merged = new Map<number, number>()
    for (const entry of parsed) {
      if (typeof entry !== 'object' || entry === null) continue
      const candidate = entry as { presentationId?: unknown; quantity?: unknown }
      const presentationId = Number(candidate.presentationId)
      const quantity = Number(candidate.quantity)
      if (!Number.isInteger(presentationId) || presentationId <= 0) continue
      if (!Number.isInteger(quantity) || quantity <= 0) continue
      merged.set(
        presentationId,
        Math.min(MAX_QUANTITY, (merged.get(presentationId) ?? 0) + quantity),
      )
    }

    return Array.from(merged, ([presentationId, quantity]) => ({ presentationId, quantity }))
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const storageKey =
    user?.role === 'cliente' ? `${STORAGE_PREFIX}:${user.id}` : null

  const [items, setItems] = useState<CartItem[]>([])
  const [ready, setReady] = useState(false)
  const [loadedKey, setLoadedKey] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return

    if (!storageKey) {
      setItems([])
      setLoadedKey(null)
      setReady(true)
      return
    }

    setReady(false)
    let raw: string | null = null
    try {
      raw = window.localStorage.getItem(storageKey)
    } catch {
      raw = null
    }
    setItems(parseStoredItems(raw))
    setLoadedKey(storageKey)
    setReady(true)
  }, [storageKey, authLoading])

  useEffect(() => {
    if (!ready || !storageKey || loadedKey !== storageKey) return
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(items))
    } catch {
      // El carrito sigue funcionando en memoria si el navegador bloquea localStorage.
    }
  }, [items, ready, storageKey, loadedKey])

  const addItem = useCallback(
    (presentationId: number, quantity = 1) => {
      if (!storageKey) return false
      const amount = Math.max(1, Math.min(MAX_QUANTITY, Math.trunc(quantity)))

      setItems((current) => {
        const existing = current.find((item) => item.presentationId === presentationId)
        if (!existing) {
          return [...current, { presentationId, quantity: amount }]
        }
        return current.map((item) =>
          item.presentationId === presentationId
            ? {
                ...item,
                quantity: Math.min(MAX_QUANTITY, item.quantity + amount),
              }
            : item,
        )
      })
      return true
    },
    [storageKey],
  )

  const removeItem = useCallback((presentationId: number) => {
    setItems((current) => current.filter((item) => item.presentationId !== presentationId))
  }, [])

  const setQuantity = useCallback((presentationId: number, quantity: number) => {
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setItems((current) => current.filter((item) => item.presentationId !== presentationId))
      return
    }
    const amount = Math.min(MAX_QUANTITY, Math.trunc(quantity))
    setItems((current) =>
      current.map((item) =>
        item.presentationId === presentationId ? { ...item, quantity: amount } : item,
      ),
    )
  }, [])

  const increment = useCallback((presentationId: number) => {
    setItems((current) =>
      current.map((item) =>
        item.presentationId === presentationId
          ? { ...item, quantity: Math.min(MAX_QUANTITY, item.quantity + 1) }
          : item,
      ),
    )
  }, [])

  const decrement = useCallback((presentationId: number) => {
    setItems((current) =>
      current.map((item) =>
        item.presentationId === presentationId
          ? { ...item, quantity: Math.max(1, item.quantity - 1) }
          : item,
      ),
    )
  }, [])

  const clear = useCallback(() => setItems([]), [])

  const totalUnits = useMemo(
    () => items.reduce((total, item) => total + item.quantity, 0),
    [items],
  )

  const value = useMemo(
    () => ({
      items,
      ready,
      canUseCart: Boolean(storageKey),
      totalUnits,
      addItem,
      removeItem,
      setQuantity,
      increment,
      decrement,
      clear,
    }),
    [items, ready, storageKey, totalUnits, addItem, removeItem, setQuantity, increment, decrement, clear],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart debe usarse dentro de CartProvider')
  }
  return context
}
