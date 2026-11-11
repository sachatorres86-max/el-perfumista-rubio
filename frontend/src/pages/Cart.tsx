import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useToast } from '../components/Toast'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { CART_STATUS_LABEL, CART_STATUS_TONE } from '../lib/cartStatus'
import { formatDate } from '../lib/format'
import type { OrderCreated } from '../lib/types'
import { ProductImage } from '../components/ProductImage'
import { Badge, Button, Card, EmptyState, Skeleton } from '../components/ui'

export function Cart() {
  const { user, loading: authLoading } = useAuth()
  const { items, ready, totalUnits, increment, decrement, removeItem, clear } = useCart()
  const { toast } = useToast()
  const [placedOrder, setPlacedOrder] = useState<OrderCreated | null>(null)

  useDocumentTitle('Mi carrito | El Perfumista Rubio')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['cart-validation', items],
    queryFn: () => api.client.validateCart(items),
    enabled: Boolean(user && user.role === 'cliente' && ready && items.length > 0),
  })

  const orderMutation = useMutation({
    mutationFn: () => api.client.placeOrder(items),
    onSuccess: (order) => {
      setPlacedOrder(order)
      clear()
      toast(`Pedido #${order.id} enviado a revisión`, 'success')
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  if (authLoading || !ready) {
    return (
      <div className="container-page py-12">
        <Skeleton className="h-10 w-64" />
        <div className="mt-6 space-y-3">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={<ShoppingBag className="h-8 w-8" />}
          title="Inicia sesión para armar tu carrito"
          description="Crea tu cuenta de cliente para guardar tus fragancias y enviar tu consulta a tu vendedor."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link
                to="/cuenta/ingresar"
                className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white"
              >
                Iniciar sesión
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/cuenta/registro"
                className="inline-flex h-11 items-center rounded-full border border-sand-300 px-5 text-sm font-semibold text-ink"
              >
                Crear cuenta
              </Link>
            </div>
          }
        />
      </div>
    )
  }

  if (user.role !== 'cliente') {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={<ShoppingBag className="h-8 w-8" />}
          title="El carrito es exclusivo de clientes"
          description="Tu sesión es de personal. Los clientes arman su carrito desde el catálogo público."
          action={
            <Link
              to="/admin"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white"
            >
              Ir al panel
            </Link>
          }
        />
      </div>
    )
  }

  if (placedOrder) {
    return (
      <div className="container-page py-16">
        <Card className="mx-auto max-w-2xl p-6 text-center sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <ClipboardCheck className="h-8 w-8" />
          </div>
          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-700">
            Pedido recibido
          </p>
          <h1 className="mt-2 font-display text-4xl text-ink sm:text-5xl">
            Pedido #{placedOrder.id}
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-ink-muted">
            Tu pedido estará pendiente de la revisión del vendedor. Él confirmará la
            disponibilidad y el precio antes de prepararlo.
          </p>
          <div className="mx-auto mt-6 flex max-w-md items-start gap-3 rounded-2xl bg-sand-50 p-4 text-left text-sm text-ink-muted">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
            <span>
              {placedOrder.expires_at
                ? `Si no se confirma antes del ${formatDate(placedOrder.expires_at)}, el pedido se cancelará automáticamente.`
                : 'Si no se confirma en 48 horas, el pedido se cancelará automáticamente.'}
            </span>
          </div>
          <p className="mt-4 text-sm font-semibold text-ink">
            {placedOrder.total_units}{' '}
            {placedOrder.total_units === 1 ? 'unidad solicitada' : 'unidades solicitadas'}
          </p>
          <Link
            to="/catalogo"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Seguir explorando
          </Link>
        </Card>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={<ShoppingBag className="h-8 w-8" />}
          title="Tu carrito está vacío"
          description="Explora el catálogo y agrega las fragancias que quieras consultar."
          action={
            <Link
              to="/catalogo"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Ver catálogo
            </Link>
          }
        />
      </div>
    )
  }

  const lines = data?.items ?? []
  const unavailable = data?.unavailable_items ?? []
  const hasIssues = Boolean(data && !data.valid)

  return (
    <div className="container-page py-10 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-700">
            Tu selección
          </p>
          <h1 className="mt-2 font-display text-4xl text-ink sm:text-5xl">Mi carrito</h1>
          <p className="mt-2 text-sm text-ink-muted">
            {totalUnits} {totalUnits === 1 ? 'unidad' : 'unidades'} · Los precios se confirman
            con tu vendedor.
          </p>
        </div>
        <Link
          to="/catalogo"
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Seguir comprando
        </Link>
      </div>

      {isError && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span>No pudimos validar tu carrito. Revisa tu conexión e inténtalo de nuevo.</span>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      )}

      {unavailable.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Algunos productos ya no existen en el catálogo.
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => unavailable.forEach((id) => removeItem(id))}
          >
            Quitar no disponibles
          </Button>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="space-y-4">
          {isLoading && lines.length === 0 ? (
            Array.from({ length: items.length }).map((_, index) => (
              <Skeleton key={index} className="h-32 w-full rounded-2xl" />
            ))
          ) : (
            lines.map((line) => (
              <Card key={line.presentation_id} className="p-4 sm:p-5">
                <div className="flex gap-4">
                  <Link
                    to={`/producto/${line.product_slug}`}
                    className="h-24 w-20 shrink-0 overflow-hidden rounded-2xl bg-sand-100"
                  >
                    <ProductImage src={line.image_url} alt={line.product_name} />
                  </Link>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          to={`/producto/${line.product_slug}`}
                          className="break-words font-display text-xl leading-tight text-ink hover:text-brand-700"
                        >
                          {line.product_name}
                        </Link>
                        <p className="mt-1 text-xs text-ink-muted">
                          {line.volume_ml} ml
                          {line.bottle_type ? ` · ${line.bottle_type}` : ''}
                        </p>
                      </div>
                      <Badge tone={CART_STATUS_TONE[line.status]}>
                        {CART_STATUS_LABEL[line.status]}
                      </Badge>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="inline-flex items-center rounded-full border border-sand-300 bg-white">
                        <button
                          type="button"
                          onClick={() => decrement(line.presentation_id)}
                          disabled={line.quantity <= 1}
                          className="flex h-9 w-9 items-center justify-center rounded-full text-ink transition hover:bg-sand-100 disabled:opacity-40"
                          aria-label="Quitar una unidad"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-9 text-center text-sm font-bold text-ink">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => increment(line.presentation_id)}
                          disabled={!line.can_increase || line.quantity >= 99}
                          className="flex h-9 w-9 items-center justify-center rounded-full text-ink transition hover:bg-sand-100 disabled:opacity-40"
                          aria-label="Agregar una unidad"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(line.presentation_id)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted transition hover:text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Quitar
                      </button>
                    </div>

                    {line.status === 'insuficiente' && (
                      <p className="mt-2 text-xs font-medium text-amber-700">
                        No hay suficientes unidades disponibles. Reduce la cantidad para continuar.
                      </p>
                    )}
                    {line.status === 'no_disponible' && (
                      <p className="mt-2 text-xs font-medium text-ink-muted">
                        Esta presentación está agotada o ya no está publicada.
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        <Card className="p-5 lg:sticky lg:top-24">
          <h2 className="font-display text-2xl text-ink">Resumen</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between text-ink-muted">
              <dt>Presentaciones</dt>
              <dd className="font-semibold text-ink">{lines.length || items.length}</dd>
            </div>
            <div className="flex justify-between text-ink-muted">
              <dt>Unidades</dt>
              <dd className="font-semibold text-ink">{totalUnits}</dd>
            </div>
          </dl>

          <div className="mt-4 flex items-start gap-2 rounded-2xl bg-sand-50 p-3 text-xs text-ink-muted">
            {hasIssues ? (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            )}
            <span>
              {hasIssues
                ? 'Revisa las cantidades marcadas antes de realizar tu pedido.'
                : 'Todo lo que tienes en el carrito está disponible para pedido.'}
            </span>
          </div>

          <Button
            className="mt-4 w-full"
            onClick={() => orderMutation.mutate()}
            loading={orderMutation.isPending}
            disabled={!data || !data.valid || isLoading}
          >
            <ClipboardCheck className="h-4 w-4" />
            Realizar pedido
          </Button>
          <p className="mt-3 text-center text-[11px] leading-relaxed text-ink-muted">
            El pedido quedará pendiente de revisión. Tu vendedor confirmará disponibilidad
            y precio; si no lo confirma en 48 horas, se cancelará automáticamente.
          </p>
        </Card>
      </div>
    </div>
  )
}
