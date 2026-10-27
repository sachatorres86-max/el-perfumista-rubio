import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  DollarSign,
  Package,
  Plus,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'
import { api } from '../../lib/api'
import { formatCOP, formatDate, formatNumber, MOVEMENT_TYPE_LABELS } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { MovementModal } from '../../components/admin/MovementModal'
import { Badge, Button, Card, PageHeader, Skeleton, StatCard } from '../../components/ui'

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

export function Dashboard() {
  const { user } = useAuth()
  const [movementOpen, setMovementOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: api.admin.dashboard,
  })

  return (
    <>
      <PageHeader
        title={`Hola, ${user?.name ?? 'equipo'}`}
        description="Resumen del catálogo y del inventario en tiempo real."
        actions={
          <>
            <Button variant="outline" onClick={() => setMovementOpen(true)}>
              <SlidersHorizontal className="h-4 w-4" />
              Registrar movimiento
            </Button>
            <Link to="/admin/productos/nuevo">
              <Button>
                <Plus className="h-4 w-4" />
                Nuevo producto
              </Button>
            </Link>
          </>
        }
      />

      {isLoading || !data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Productos activos"
              value={formatNumber(data.products_active)}
              hint={`${data.products_total} en total`}
              icon={<Package className="h-5 w-5" />}
              tone="brand"
            />
            <StatCard
              label="Presentaciones"
              value={formatNumber(data.presentations_count)}
              hint="Publicadas en el catálogo"
              icon={<Sparkles className="h-5 w-5" />}
              tone="accent"
            />
            <StatCard
              label="Insumos activos"
              value={formatNumber(data.supplies_count)}
              hint="Materias primas y frascos"
              icon={<Boxes className="h-5 w-5" />}
              tone="ink"
            />
            <StatCard
              label="Valor del inventario"
              value={formatCOP(data.inventory_value_cop)}
              hint={`Productos ${formatCOP(data.product_value_cop)}`}
              icon={<DollarSign className="h-5 w-5" />}
              tone="emerald"
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Link to="/admin/productos?estado=agotado">
              <Card className="card-hover p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    Productos agotados
                  </p>
                  <AlertTriangle className="h-4 w-4 text-rose-500" />
                </div>
                <p className="mt-2 text-3xl font-bold text-ink">
                  {formatNumber(data.out_of_stock_products)}
                </p>
                <p className="mt-1 text-xs text-ink-muted">Sin stock en todas sus presentaciones</p>
              </Card>
            </Link>

            <Link to="/admin/productos?estado=stock_bajo">
              <Card className="card-hover p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    Presentaciones con stock bajo
                  </p>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                </div>
                <p className="mt-2 text-3xl font-bold text-ink">
                  {formatNumber(data.low_stock_presentations)}
                </p>
                <p className="mt-1 text-xs text-ink-muted">Requieren reposición</p>
              </Card>
            </Link>

            <Link to="/admin/insumos?stock_bajo=true">
              <Card className="card-hover p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    Insumos con stock bajo
                  </p>
                  <Boxes className="h-4 w-4 text-amber-500" />
                </div>
                <p className="mt-2 text-3xl font-bold text-ink">
                  {formatNumber(data.low_stock_supplies)}
                </p>
                <p className="mt-1 text-xs text-ink-muted">Esencias, frascos y accesorios</p>
              </Card>
            </Link>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl text-ink">Últimos movimientos</h2>
                <Link
                  to="/admin/inventario"
                  className="text-xs font-semibold text-brand-700 hover:text-brand-800"
                >
                  Ver historial
                </Link>
              </div>

              {data.recent_movements.length === 0 ? (
                <p className="mt-6 text-sm text-ink-muted">Aún no hay movimientos registrados.</p>
              ) : (
                <ul className="mt-4 divide-y divide-sand-200">
                  {data.recent_movements.map((movement) => {
                    const Icon = MOVEMENT_ICON[movement.movement_type]
                    return (
                      <li key={movement.id} className="flex items-start gap-3 py-3">
                        <span
                          className={`mt-0.5 rounded-xl p-2 ${MOVEMENT_TONE[movement.movement_type]}`}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink">
                            {movement.item_label}
                          </p>
                          <p className="text-xs text-ink-muted">
                            {MOVEMENT_TYPE_LABELS[movement.movement_type]} · {movement.quantity}{' '}
                            {movement.item_type === 'insumo' ? 'u.' : 'unid.'} → stock{' '}
                            {movement.resulting_stock}
                            {movement.reason ? ` · ${movement.reason}` : ''}
                          </p>
                        </div>
                        <span className="shrink-0 text-[11px] text-ink-muted">
                          {formatDate(movement.created_at)}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Card>

            <Card className="p-5">
              <h2 className="text-xl text-ink">Catálogo por familia</h2>
              <p className="mt-1 text-xs text-ink-muted">
                Distribución de productos activos por familia olfativa.
              </p>
              <ul className="mt-5 space-y-3">
                {data.families.map((family) => {
                  const max = Math.max(...data.families.map((item) => item.count), 1)
                  return (
                    <li key={family.name}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-ink">{family.name}</span>
                        <span className="text-ink-muted">{family.count}</span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-sand-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
                          style={{ width: `${(family.count / max) * 100}%` }}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>

              <div className="mt-6 rounded-xl bg-sand-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Valor por categoría
                </p>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Productos terminados</span>
                    <span className="font-semibold text-ink">{formatCOP(data.product_value_cop)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Insumos</span>
                    <span className="font-semibold text-ink">{formatCOP(data.supply_value_cop)}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}

      <MovementModal open={movementOpen} onClose={() => setMovementOpen(false)} />
    </>
  )
}
