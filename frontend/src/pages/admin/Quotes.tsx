import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, CheckCircle2, ClipboardCheck, ClipboardList, Clock } from 'lucide-react'
import { api } from '../../lib/api'
import type { Quote } from '../../lib/types'
import { formatCOP, formatDate } from '../../lib/format'
import { useToast } from '../../components/Toast'
import { ConfirmModal } from '../../components/ConfirmModal'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Select,
  Skeleton,
} from '../../components/ui'

const QUOTE_STATUS = {
  pendiente: { label: 'Pendiente', tone: 'warning' as const },
  confirmada: { label: 'Confirmada', tone: 'success' as const },
  cancelada: { label: 'Cancelada', tone: 'neutral' as const },
}

export function Quotes() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [confirmTarget, setConfirmTarget] = useState<Quote | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Quote | null>(null)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const estadoParam = searchParams.get('estado')
  const estado = estadoParam ?? 'pendiente'
  const estadoFilter = estado === 'todas' ? undefined : estado
  const page = Number(searchParams.get('page') ?? '1')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-quotes', { estado, page }],
    queryFn: () =>
      api.admin.quotes({
        estado: estadoFilter,
        page,
        page_size: 20,
      }),
  })

  const refreshQuotes = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-quotes'] })
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })
    queryClient.invalidateQueries({ queryKey: ['admin-products'] })
    queryClient.invalidateQueries({ queryKey: ['report-summary'] })
  }

  const confirmMutation = useMutation({
    mutationFn: (id: number) => api.admin.confirmQuote(id),
    onSuccess: (quote) => {
      toast(`Pedido #${quote.id} confirmado; stock descontado`, 'success')
      setConfirmTarget(null)
      refreshQuotes()
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: number) => api.admin.cancelQuote(id),
    onSuccess: (quote) => {
      toast(`Pedido #${quote.id} cancelado; stock restaurado`)
      setCancelTarget(null)
      refreshQuotes()
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  const updateParam = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setSearchParams(next)
  }

  return (
    <>
      <PageHeader
        title="Cotizaciones"
        description="Revisa los pedidos de los clientes y confirma los que estén listos. Al confirmar se descuenta el stock."
      />

      <Card className="mb-5 p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <Select
            value={estado}
            onChange={(event) => updateParam('estado', event.target.value)}
            aria-label="Filtrar pedidos por estado"
          >
            <option value="pendiente">Pendientes</option>
            <option value="confirmada">Confirmadas</option>
            <option value="cancelada">Canceladas</option>
            <option value="todas">Todos los pedidos</option>
          </Select>
          <p className="text-sm text-ink-muted">
            {data
              ? `${data.total} ${data.total === 1 ? 'pedido' : 'pedidos'}`
              : '…'}
          </p>
        </div>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-52" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-8 w-8" />}
          title={estado === 'pendiente' ? 'Sin pedidos pendientes' : 'Sin pedidos'}
          description={
            estado === 'pendiente'
              ? 'Los pedidos que realicen los clientes desde su carrito aparecerán aquí para revisión.'
              : 'No hay pedidos que coincidan con este filtro.'
          }
        />
      ) : (
        <>
          <div className="space-y-4">
            {data.items.map((quote) => {
              const status = QUOTE_STATUS[quote.status]
              return (
                <Card key={quote.id} className="overflow-hidden">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-sand-200 bg-sand-50/60 px-4 py-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-display text-xl text-ink">
                          Pedido #{quote.id}
                        </h2>
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </div>
                      <p className="mt-1 break-words text-xs text-ink-muted">
                        {quote.client_name ?? 'Cliente'}
                        {quote.client_email ? ` · ${quote.client_email}` : ''}
                      </p>
                      <p className="mt-1 text-[11px] text-ink-muted">
                        Realizado {formatDate(quote.created_at)}
                      </p>
                      {quote.status === 'pendiente' && quote.expires_at && (
                        <p className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-amber-700">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          Vence {formatDate(quote.expires_at)}
                        </p>
                      )}
                      {quote.confirmed_by_name && (
                        <p className="mt-1 text-[11px] text-ink-muted">
                          Confirmó {quote.confirmed_by_name}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-lg font-bold text-ink">
                        {formatCOP(quote.total_cop)}
                      </p>
                      <p className="text-[11px] text-ink-muted">
                        {quote.total_units}{' '}
                        {quote.total_units === 1 ? 'unidad' : 'unidades'}
                      </p>
                    </div>
                  </div>

                  <ul className="divide-y divide-sand-100 px-4">
                    {quote.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="break-words font-semibold text-ink">
                            {item.product_name}
                          </p>
                          <p className="text-[11px] text-ink-muted">
                            {item.volume_ml} ml
                            {item.bottle_type ? ` · ${item.bottle_type}` : ''}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs text-ink-muted">
                            {item.quantity} × {formatCOP(item.unit_price_cop)}
                          </p>
                          <p className="text-sm font-semibold text-ink">
                            {formatCOP(item.line_total_cop)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {quote.status === 'pendiente' && (
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-sand-200 px-4 py-3">
                      <p className="text-[11px] text-ink-muted">
                        El stock se descuenta únicamente al confirmar.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => setConfirmTarget(quote)}
                      >
                        <ClipboardCheck className="h-3.5 w-3.5" />
                        Confirmar pedido
                      </Button>
                    </div>
                  )}

                  {quote.status === 'confirmada' && (
                    <div className="flex justify-end border-t border-sand-200 px-4 py-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCancelTarget(quote)}
                      >
                        <Ban className="h-3.5 w-3.5" />
                        Cancelar y devolver stock
                      </Button>
                    </div>
                  )}

                  {quote.status === 'cancelada' && (
                    <p className="border-t border-sand-200 px-4 py-2 text-[11px] text-ink-muted">
                      {quote.cancelled_automatically
                        ? 'Cancelado automáticamente al cumplirse las 48 horas sin confirmación.'
                        : quote.cancelled_by_name
                          ? `Cancelado por ${quote.cancelled_by_name}. El stock fue restaurado.`
                          : 'Pedido cancelado.'}
                    </p>
                  )}
                </Card>
              )
            })}
          </div>

          {data.pages > 1 && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => updateParam('page', String(page - 1))}
              >
                Anterior
              </Button>
              <span className="text-xs text-ink-muted">
                Página {data.page} de {data.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.pages}
                onClick={() => updateParam('page', String(page + 1))}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}

      <ConfirmModal
        open={confirmTarget !== null}
        onClose={() => setConfirmTarget(null)}
        onConfirm={() => {
          if (confirmTarget) confirmMutation.mutate(confirmTarget.id)
        }}
        title="Confirmar pedido"
        description="Se descontará el stock de las presentaciones y quedará registrado en el inventario."
        confirmText="Confirmar y descontar stock"
        loading={confirmMutation.isPending}
      >
        <div className="space-y-3 text-sm text-ink-muted">
          <p>
            Vas a confirmar{' '}
            <strong className="text-ink">{confirmTarget?.total_units ?? 0} unidades</strong>{' '}
            por <strong className="text-ink">{formatCOP(confirmTarget?.total_cop)}</strong>.
          </p>
          <p>
            Cliente: <strong className="text-ink">{confirmTarget?.client_name ?? '—'}</strong>
            {confirmTarget?.client_email ? ` · ${confirmTarget.client_email}` : ''}
          </p>
          <p className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>
              El pedido pasará a confirmado. Si la venta no se completa, puedes cancelarlo
              después para recuperar el stock.
            </span>
          </p>
        </div>
      </ConfirmModal>

      <ConfirmModal
        open={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => {
          if (cancelTarget) cancelMutation.mutate(cancelTarget.id)
        }}
        title="Cancelar pedido"
        description="El stock reservado volverá al inventario."
        confirmText="Cancelar y devolver stock"
        loading={cancelMutation.isPending}
      >
        <div className="space-y-3 text-sm text-ink-muted">
          <p className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>
              Se devolverán{' '}
              <strong className="text-ink">{cancelTarget?.total_units ?? 0} unidades</strong>{' '}
              al inventario.
            </span>
          </p>
          <p>
            Usa esta opción si el cliente no retiró el producto o no completó el pago. El
            pedido quedará registrado como cancelado.
          </p>
        </div>
      </ConfirmModal>
    </>
  )
}
