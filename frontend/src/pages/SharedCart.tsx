import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Lock,
  MessageCircle,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ConfirmModal } from '../components/ConfirmModal'
import { ProductImage } from '../components/ProductImage'
import { useToast } from '../components/Toast'
import { Badge, Button, Card, EmptyState, Skeleton } from '../components/ui'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { api } from '../lib/api'
import { CART_STATUS_LABEL, CART_STATUS_TONE } from '../lib/cartShare'
import { formatCOP } from '../lib/format'
import type { Quote } from '../lib/types'

export function SharedCart() {
  const { token = '' } = useParams()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmedQuote, setConfirmedQuote] = useState<Quote | null>(null)
  useDocumentTitle('Cotización compartida | El Perfumista Rubio')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['shared-cart', token],
    queryFn: () => api.sharedCart(token),
    enabled: Boolean(token),
    retry: false,
  })

  const confirmMutation = useMutation({
    mutationFn: () => api.admin.confirmQuote(token),
    onSuccess: (quote) => {
      setConfirmedQuote(quote)
      setConfirmOpen(false)
      toast(`Cotización #${quote.id} confirmada`)
      queryClient.invalidateQueries({ queryKey: ['admin-quotes'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      queryClient.invalidateQueries({ queryKey: ['report-summary'] })
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  if (isLoading) {
    return (
      <div className="container-page py-12">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="mt-4 h-5 w-80 max-w-full" />
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <Skeleton className="h-36 w-full rounded-2xl" />
            <Skeleton className="h-36 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={<AlertTriangle className="h-8 w-8" />}
          title="No pudimos abrir esta cotización"
          description="Revisa que el enlace esté completo e inténtalo de nuevo. Si el problema continúa, pide a tu vendedor que comparta el carrito otra vez."
          action={
            <Link
              to="/catalogo"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Ir al catálogo
            </Link>
          }
        />
      </div>
    )
  }

  const isStaff = data.viewer_role === 'admin' || data.viewer_role === 'vendedor'

  return (
    <div className="container-page py-10 sm:py-14">
      <Link
        to="/catalogo"
        className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al catálogo
      </Link>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-700">
            Cotización compartida
          </p>
          <h1 className="mt-2 font-display text-4xl text-ink sm:text-5xl">
            Carrito para revisión
          </h1>
          <p className="mt-2 max-w-xl text-sm text-ink-muted">
            {data.total_units} {data.total_units === 1 ? 'unidad seleccionada' : 'unidades seleccionadas'}{' '}
            en {data.items.length} {data.items.length === 1 ? 'presentación' : 'presentaciones'}.
          </p>
        </div>
        <Badge tone={isStaff ? 'brand' : 'neutral'}>
          {isStaff ? 'Vista de personal' : 'Vista de cliente'}
        </Badge>
      </div>

      {isStaff ? (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-900">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
          <div>
            <p className="font-semibold">Estás viendo esta cotización como personal</p>
            <p className="mt-1 text-brand-800/80">
              Los precios y el total son de referencia según el catálogo vigente. Revisa las
              cantidades y la disponibilidad antes de confirmar con el cliente.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-900">
          <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
          <div>
            <p className="font-semibold">Tu vendedor revisará tu compra</p>
            <p className="mt-1 text-brand-800/80">
              Este enlace muestra tu selección, pero no reserva stock ni confirma precios. Tu
              vendedor se pondrá en contacto contigo.
            </p>
          </div>
        </div>
      )}

      {data.unavailable_items.length > 0 && (
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {data.unavailable_items.length === 1
              ? 'Una presentación del enlace ya no existe en el catálogo.'
              : `${data.unavailable_items.length} presentaciones del enlace ya no existen en el catálogo.`}
          </span>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="space-y-4">
          {data.items.length === 0 ? (
            <EmptyState
              icon={<ShoppingBag className="h-8 w-8" />}
              title="No hay presentaciones disponibles"
              description="Las presentaciones de este enlace ya no están publicadas. Pide a tu vendedor que comparta un carrito actualizado."
            />
          ) : (
            data.items.map((line) => (
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
                          {line.brand ? `${line.brand} · ` : ''}
                          {line.volume_ml} ml
                          {line.bottle_type ? ` · ${line.bottle_type}` : ''}
                        </p>
                      </div>
                      <Badge tone={CART_STATUS_TONE[line.status]}>
                        {CART_STATUS_LABEL[line.status]}
                      </Badge>
                    </div>

                    <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                      <p className="text-sm font-semibold text-ink">
                        {line.quantity} {line.quantity === 1 ? 'unidad' : 'unidades'}
                      </p>
                      {isStaff ? (
                        <div className="text-right">
                          <p className="text-sm font-bold text-ink">
                            {formatCOP(line.line_total_cop)}
                          </p>
                          <p className="text-[11px] text-ink-muted">
                            {formatCOP(line.unit_price_cop)} c/u
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-ink-muted">
                          Precio a confirmar con tu vendedor
                        </p>
                      )}
                    </div>
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
              <dd className="font-semibold text-ink">{data.items.length}</dd>
            </div>
            <div className="flex justify-between text-ink-muted">
              <dt>Unidades</dt>
              <dd className="font-semibold text-ink">{data.total_units}</dd>
            </div>
          </dl>

          {isStaff && (
            <div className="mt-4 flex items-end justify-between gap-3 border-t border-sand-200 pt-4">
              <span className="text-sm font-semibold text-ink">Total de referencia</span>
              <span className="text-xl font-bold text-ink">{formatCOP(data.total_cop)}</span>
            </div>
          )}

          <div className="mt-4 flex items-start gap-2 rounded-2xl bg-sand-50 p-3 text-xs text-ink-muted">
            {data.valid ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            )}
            <span>
              {data.valid
                ? 'Todas las presentaciones están disponibles según el catálogo.'
                : 'Hay presentaciones que requieren revisión antes de confirmar la compra.'}
            </span>
          </div>

          {isStaff && (
            <div className="mt-4 border-t border-sand-200 pt-4">
              {confirmedQuote ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  <p className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-4 w-4" />
                    Cotización #{confirmedQuote.id} confirmada
                  </p>
                  <p className="mt-1 text-xs">
                    El stock fue descontado. Puedes cancelarla desde Cotizaciones si la venta no
                    se completa.
                  </p>
                  <Link
                    to="/admin/cotizaciones"
                    className="mt-3 inline-flex text-xs font-bold text-emerald-800 underline underline-offset-2"
                  >
                    Ver cotizaciones
                  </Link>
                </div>
              ) : (
                <>
                  <Button
                    className="w-full"
                    onClick={() => setConfirmOpen(true)}
                    disabled={!data.valid}
                  >
                    <ClipboardCheck className="h-4 w-4" />
                    Confirmar cotización
                  </Button>
                  <p className="mt-2 text-center text-[11px] text-ink-muted">
                    Al confirmar se descuenta el stock de estas presentaciones.
                  </p>
                </>
              )}
            </div>
          )}

          {!isStaff && (
            <div className="mt-3 flex items-start gap-2 rounded-2xl border border-sand-200 p-3 text-xs text-ink-muted">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Los precios no se muestran en este enlace público.</span>
            </div>
          )}

          <p className="mt-4 text-[11px] leading-relaxed text-ink-muted">
            {isStaff
              ? 'La confirmación descuenta stock; la cancelación lo devuelve.'
              : 'La confirmación de la cotización solo la puede realizar el personal.'}
          </p>
        </Card>
      </div>

      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => confirmMutation.mutate()}
        title="Confirmar cotización"
        description="Se descontará stock y quedará registrada en el panel."
        confirmText="Confirmar y descontar stock"
        variant="primary"
        loading={confirmMutation.isPending}
      >
        <div className="space-y-3 text-sm text-ink-muted">
          <p>
            Vas a confirmar <strong className="text-ink">{data.total_units} unidades</strong> por{' '}
            <strong className="text-ink">{formatCOP(data.total_cop)}</strong>.
          </p>
          <p>
            El stock se reduce de inmediato. Si el cliente no paga o no retira el producto, puedes
            cancelar la cotización desde el panel para recuperarlo.
          </p>
        </div>
      </ConfirmModal>
    </div>
  )
}
