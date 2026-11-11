import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, CheckCircle2, ClipboardList } from 'lucide-react'
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

export function Quotes() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [cancelTarget, setCancelTarget] = useState<Quote | null>(null)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const estado = searchParams.get('estado') ?? ''
  const page = Number(searchParams.get('page') ?? '1')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-quotes', { estado, page }],
    queryFn: () =>
      api.admin.quotes({
        estado: estado || undefined,
        page,
        page_size: 20,
      }),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: number) => api.admin.cancelQuote(id),
    onSuccess: (quote) => {
      toast(`Cotización #${quote.id} cancelada; stock restaurado`)
      setCancelTarget(null)
      queryClient.invalidateQueries({ queryKey: ['admin-quotes'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      queryClient.invalidateQueries({ queryKey: ['report-summary'] })
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
        description="Cotizaciones confirmadas desde enlaces compartidos y su estado de stock."
      />

      <Card className="mb-5 p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <Select
            value={estado}
            onChange={(event) => updateParam('estado', event.target.value)}
            aria-label="Filtrar cotizaciones por estado"
          >
            <option value="">Todas las cotizaciones</option>
            <option value="confirmada">Confirmadas</option>
            <option value="cancelada">Canceladas</option>
          </Select>
          <p className="text-sm text-ink-muted">
            {data ? `${data.total} ${data.total === 1 ? 'cotización' : 'cotizaciones'}` : '…'}
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
          title="Sin cotizaciones"
          description="Las cotizaciones confirmadas desde un carrito compartido aparecerán aquí."
        />
      ) : (
        <>
          <div className="space-y-4">
            {data.items.map((quote) => (
              <Card key={quote.id} className="overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-sand-200 bg-sand-50/60 px-4 py-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-xl text-ink">Cotización #{quote.id}</h2>
                      <Badge tone={quote.status === 'confirmada' ? 'success' : 'neutral'}>
                        {quote.status === 'confirmada' ? 'Confirmada' : 'Cancelada'}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[11px] text-ink-muted">
                      {formatDate(quote.created_at)}
                      {quote.confirmed_by_name ? ` · Confirmó ${quote.confirmed_by_name}` : ''}
                      {quote.cancelled_at ? ` · Cancelada ${formatDate(quote.cancelled_at)}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-ink">{formatCOP(quote.total_cop)}</p>
                    <p className="text-[11px] text-ink-muted">
                      {quote.total_units} {quote.total_units === 1 ? 'unidad' : 'unidades'}
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
                        <p className="break-words font-semibold text-ink">{item.product_name}</p>
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

                {quote.status === 'cancelada' && quote.cancelled_by_name && (
                  <p className="border-t border-sand-200 px-4 py-2 text-[11px] text-ink-muted">
                    Cancelada por {quote.cancelled_by_name}. El stock fue restaurado.
                  </p>
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
              </Card>
            ))}
          </div>

          {data.pages > 1 && (
            <div className="mt-5 flex items-center justify-center gap-2">
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
        open={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => {
          if (cancelTarget) cancelMutation.mutate(cancelTarget.id)
        }}
        title="Cancelar cotización"
        description="El stock reservado volverá al inventario."
        confirmText="Cancelar y devolver stock"
        loading={cancelMutation.isPending}
      >
        <div className="space-y-3 text-sm text-ink-muted">
          <p className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>
              Se devolverán <strong className="text-ink">{cancelTarget?.total_units ?? 0} unidades</strong>{' '}
              al inventario.
            </span>
          </p>
          <p>
            Usa esta opción si el cliente no retiró el producto o no completó el pago. La
            cotización quedará registrada como cancelada.
          </p>
        </div>
      </ConfirmModal>
    </>
  )
}
