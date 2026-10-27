import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowDownLeft,
  ArrowUpRight,
  History,
  Plus,
  SlidersHorizontal,
} from 'lucide-react'
import { api } from '../../lib/api'
import { formatDate, ITEM_TYPE_LABELS, MOVEMENT_TYPE_LABELS } from '../../lib/format'
import { MovementModal } from '../../components/admin/MovementModal'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Select,
  Skeleton,
} from '../../components/ui'
import { cn } from '../../lib/cn'

const MOVEMENT_ICON = {
  entrada: ArrowDownLeft,
  salida: ArrowUpRight,
  ajuste: SlidersHorizontal,
}

const MOVEMENT_TONE = {
  entrada: 'text-emerald-600 bg-emerald-50',
  salida: 'text-rose-600 bg-rose-50',
  ajuste: 'text-amber-600 bg-amber-50',
}

export function Inventory() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [open, setOpen] = useState(false)

  const itemType = searchParams.get('item_type') ?? ''
  const movementType = searchParams.get('movement_type') ?? ''
  const page = Number(searchParams.get('page') ?? '1')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-movements', { itemType, movementType, page }],
    queryFn: () =>
      api.admin.movements({
        item_type: itemType || undefined,
        movement_type: movementType || undefined,
        page,
        page_size: 25,
      }),
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
        title="Inventario"
        description="Historial de entradas, salidas y ajustes de stock."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Registrar movimiento
          </Button>
        }
      />

      <Card className="mb-5 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
          <Select
            value={itemType}
            onChange={(event) => updateParam('item_type', event.target.value)}
          >
            <option value="">Todos los artículos</option>
            <option value="presentacion">Productos terminados</option>
            <option value="insumo">Insumos</option>
          </Select>
          <Select
            value={movementType}
            onChange={(event) => updateParam('movement_type', event.target.value)}
          >
            <option value="">Todos los movimientos</option>
            <option value="entrada">Entradas</option>
            <option value="salida">Salidas</option>
            <option value="ajuste">Ajustes</option>
          </Select>
          <div className="flex items-center text-sm text-ink-muted">
            {data ? `${data.total} movimientos` : '…'}
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-16" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={<History className="h-8 w-8" />}
          title="Sin movimientos"
          description="Registra entradas, salidas o ajustes para ver el historial aquí."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" />
              Registrar movimiento
            </Button>
          }
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-sand-200 bg-white">
            <div className="hidden grid-cols-[auto_minmax(0,2fr)_1fr_1fr_1fr_1fr] gap-4 border-b border-sand-200 bg-sand-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted lg:grid">
              <span>Tipo</span>
              <span>Artículo</span>
              <span>Movimiento</span>
              <span>Cantidad</span>
              <span>Stock final</span>
              <span>Fecha / usuario</span>
            </div>
            <ul className="divide-y divide-sand-200">
              {data.items.map((movement) => {
                const Icon = MOVEMENT_ICON[movement.movement_type]
                return (
                  <li
                    key={movement.id}
                    className="grid gap-2 px-4 py-3.5 lg:grid-cols-[auto_minmax(0,2fr)_1fr_1fr_1fr_1fr] lg:items-center"
                  >
                    <span className={cn('inline-flex rounded-lg p-2', MOVEMENT_TONE[movement.movement_type])}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">
                        {movement.item_label}
                      </p>
                      <p className="text-[11px] text-ink-muted">
                        {ITEM_TYPE_LABELS[movement.item_type]}
                      </p>
                    </div>
                    <div>
                      <Badge
                        tone={
                          movement.movement_type === 'entrada'
                            ? 'success'
                            : movement.movement_type === 'salida'
                              ? 'danger'
                              : 'warning'
                        }
                      >
                        {MOVEMENT_TYPE_LABELS[movement.movement_type]}
                      </Badge>
                    </div>
                    <div className="text-sm font-semibold text-ink">{movement.quantity}</div>
                    <div className="text-sm font-semibold text-ink">{movement.resulting_stock}</div>
                    <div className="text-[11px] text-ink-muted">
                      <p>{formatDate(movement.created_at)}</p>
                      {movement.user_name && <p className="truncate">{movement.user_name}</p>}
                    </div>
                    {movement.reason && (
                      <p className="text-[11px] italic text-ink-muted lg:col-span-6">
                        “{movement.reason}”
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
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

      <MovementModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
