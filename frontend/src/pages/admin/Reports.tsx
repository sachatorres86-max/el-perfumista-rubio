import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  ClipboardCheck,
  Download,
  DollarSign,
  Package,
  TrendingUp,
} from 'lucide-react'
import { api } from '../../lib/api'
import type { ReportPeriod } from '../../lib/types'
import { formatCOP, formatNumber } from '../../lib/format'
import { useToast } from '../../components/Toast'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Select,
  Skeleton,
  StatCard,
} from '../../components/ui'
import { cn } from '../../lib/cn'

export function Reports() {
  const { toast } = useToast()
  const [periodo, setPeriodo] = useState<ReportPeriod>('mensual')

  const { data, isLoading } = useQuery({
    queryKey: ['report-summary', periodo],
    queryFn: () => api.admin.reportSummary(periodo),
  })

  const download = (
    tipo: 'inventario' | 'agotados' | 'stock_bajo' | 'movimientos' | 'cotizaciones',
  ) => {
    window.location.href = api.admin.exportUrl(tipo, periodo)
    toast('Generando reporte PDF…', 'info')
  }

  return (
    <>
      <PageHeader
        title="Reportes"
        description="Actividad del período, alertas de stock y exportación en PDF."
        actions={
          <>
            <Button variant="outline" onClick={() => download('inventario')}>
              <Download className="h-4 w-4" />
              Inventario PDF
            </Button>
            <Button variant="outline" onClick={() => download('stock_bajo')}>
              <Download className="h-4 w-4" />
              Stock bajo PDF
            </Button>
            <Button variant="outline" onClick={() => download('agotados')}>
              <Download className="h-4 w-4" />
              Agotados PDF
            </Button>
          </>
        }
      />

      <Card className="mb-5 p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_auto_auto] lg:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Período del reporte
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              {data
                ? `${data.period_label}: actividad registrada desde el inicio del período.`
                : 'Selecciona el período de visualización y exportación.'}
            </p>
          </div>
          <Select
            value={periodo}
            onChange={(event) => setPeriodo(event.target.value as ReportPeriod)}
            aria-label="Período del reporte"
          >
            <option value="diario">Diario</option>
            <option value="semanal">Semanal</option>
            <option value="mensual">Mensual</option>
          </Select>
          <Button variant="outline" onClick={() => download('movimientos')}>
            <Download className="h-4 w-4" />
            Movimientos PDF
          </Button>
          <Button variant="outline" onClick={() => download('cotizaciones')}>
            <Download className="h-4 w-4" />
            Cotizaciones PDF
          </Button>
        </div>
      </Card>

      {isLoading || !data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
      ) : (
        <>
          <h2 className="mb-3 text-xl text-ink">Actividad del período</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Movimientos"
              value={formatNumber(data.activity.movements_total)}
              hint={`${formatNumber(data.activity.entries_units)} entradas · ${formatNumber(data.activity.exits_units)} salidas`}
              icon={<Activity className="h-5 w-5" />}
              tone="brand"
            />
            <StatCard
              label="Salidas de inventario"
              value={formatNumber(data.activity.exits_units)}
              hint="Unidades descontadas en el período"
              icon={<ArrowUpRight className="h-5 w-5" />}
              tone="rose"
            />
            <StatCard
              label="Cotizaciones confirmadas"
              value={formatNumber(data.activity.quotes_confirmed)}
              hint={`${formatNumber(data.activity.quotes_cancelled)} canceladas`}
              icon={<ClipboardCheck className="h-5 w-5" />}
              tone="emerald"
            />
            <StatCard
              label="Total cotizado"
              value={formatCOP(data.activity.quotes_total_cop)}
              hint={`${formatNumber(data.activity.quotes_units)} unidades confirmadas`}
              icon={<DollarSign className="h-5 w-5" />}
              tone="accent"
            />
          </div>

          <h2 className="mb-3 mt-7 text-xl text-ink">Estado actual del inventario</h2>
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
                    <li
                      key={item.presentation_id}
                      className="flex items-center justify-between gap-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="break-words text-sm font-semibold text-ink">
                          {item.product_name}
                        </p>
                        <p className="text-[11px] text-ink-muted">
                          {item.sku} · {item.volume_ml} ml
                        </p>
                      </div>
                      <Badge tone="danger" className="shrink-0">
                        0 disponibles
                      </Badge>
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
                          className="flex items-center justify-between gap-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="break-words text-sm font-semibold text-ink">
                              {item.product_name}
                            </p>
                            <p className="text-[11px] text-ink-muted">{item.volume_ml} ml</p>
                          </div>
                          <span className="shrink-0 text-xs font-semibold text-amber-600">
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
                        <li
                          key={item.supply_id}
                          className="flex items-center justify-between gap-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="break-words text-sm font-semibold text-ink">
                              {item.name}
                            </p>
                            <p className="text-[11px] text-ink-muted">{item.sku}</p>
                          </div>
                          <span className="shrink-0 text-xs font-semibold text-amber-600">
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
