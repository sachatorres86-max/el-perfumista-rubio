import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  Download,
  DollarSign,
  Package,
  TrendingUp,
} from 'lucide-react'
import { api } from '../../lib/api'
import { formatCOP, formatNumber } from '../../lib/format'
import { useToast } from '../../components/Toast'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Skeleton,
  StatCard,
} from '../../components/ui'
import { cn } from '../../lib/cn'

export function Reports() {
  const { toast } = useToast()

  const { data, isLoading } = useQuery({
    queryKey: ['report-summary'],
    queryFn: api.admin.reportSummary,
  })

  const download = (tipo: 'inventario' | 'agotados' | 'stock_bajo') => {
    window.location.href = api.admin.exportUrl(tipo)
    toast('Descargando reporte…', 'info')
  }

  return (
    <>
      <PageHeader
        title="Reportes"
        description="Alertas de stock, valor del inventario y exportación en CSV."
        actions={
          <>
            <Button variant="outline" onClick={() => download('inventario')}>
              <Download className="h-4 w-4" />
              Inventario
            </Button>
            <Button variant="outline" onClick={() => download('stock_bajo')}>
              <Download className="h-4 w-4" />
              Stock bajo
            </Button>
            <Button variant="outline" onClick={() => download('agotados')}>
              <Download className="h-4 w-4" />
              Agotados
            </Button>
          </>
        }
      />

      {isLoading || !data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Valor total"
              value={formatCOP(data.inventory_value_cop)}
              hint="Productos + insumos"
              icon={<DollarSign className="h-5 w-5" />}
              tone="emerald"
            />
            <StatCard
              label="Valor productos"
              value={formatCOP(data.product_value_cop)}
              hint="Stock × precio"
              icon={<Package className="h-5 w-5" />}
              tone="brand"
            />
            <StatCard
              label="Valor insumos"
              value={formatCOP(data.supply_value_cop)}
              hint="Stock × costo"
              icon={<TrendingUp className="h-5 w-5" />}
              tone="accent"
            />
            <StatCard
              label="Alertas"
              value={formatNumber(
                data.counts.low_stock_presentations +
                  data.counts.out_of_stock_presentations +
                  data.counts.low_stock_supplies,
              )}
              hint="Artículos que requieren atención"
              icon={<AlertTriangle className="h-5 w-5" />}
              tone="amber"
            />
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl text-ink">Productos agotados</h2>
                <Badge tone="danger">{data.counts.out_of_stock_presentations}</Badge>
              </div>
              {data.out_of_stock_presentations.length === 0 ? (
                <p className="mt-4 text-sm text-ink-muted">
                  No hay presentaciones agotadas. ¡Buen trabajo!
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-sand-200">
                  {data.out_of_stock_presentations.map((item) => (
                    <li key={item.presentation_id} className="flex items-center justify-between py-2.5">
                      <div>
                        <p className="text-sm font-semibold text-ink">{item.product_name}</p>
                        <p className="text-[11px] text-ink-muted">
                          {item.sku} · {item.volume_ml} ml
                        </p>
                      </div>
                      <Badge tone="danger">0 disponibles</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl text-ink">Stock bajo</h2>
                <Badge tone="warning">
                  {data.counts.low_stock_presentations + data.counts.low_stock_supplies}
                </Badge>
              </div>

              <div className="mt-4 space-y-4">
                {data.low_stock_presentations.length > 0 && (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                      Presentaciones
                    </p>
                    <ul className="divide-y divide-sand-200">
                      {data.low_stock_presentations.map((item) => (
                        <li
                          key={item.presentation_id}
                          className="flex items-center justify-between py-2"
                        >
                          <div>
                            <p className="text-sm font-semibold text-ink">{item.product_name}</p>
                            <p className="text-[11px] text-ink-muted">{item.volume_ml} ml</p>
                          </div>
                          <span className="text-xs font-semibold text-amber-600">
                            {item.stock} / mín. {item.min_stock}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {data.low_stock_supplies.length > 0 && (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                      Insumos
                    </p>
                    <ul className="divide-y divide-sand-200">
                      {data.low_stock_supplies.map((item) => (
                        <li key={item.supply_id} className="flex items-center justify-between py-2">
                          <div>
                            <p className="text-sm font-semibold text-ink">{item.name}</p>
                            <p className="text-[11px] text-ink-muted">{item.sku}</p>
                          </div>
                          <span className="text-xs font-semibold text-amber-600">
                            {item.stock} {item.unit} / mín. {item.min_stock}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {data.low_stock_presentations.length === 0 &&
                  data.low_stock_supplies.length === 0 && (
                    <p className="text-sm text-ink-muted">Todo el inventario está por encima del mínimo.</p>
                  )}
              </div>
            </Card>
          </div>

        </>
      )}
    </>
  )
}
