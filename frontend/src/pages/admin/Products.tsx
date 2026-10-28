import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Edit3,
  Eye,
  EyeOff,
  Package,
  Plus,
  Search,
  SlidersHorizontal,
  Star,
} from 'lucide-react'
import { api } from '../../lib/api'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { formatCOP, priceRange, productTypeLabel } from '../../lib/format'
import { useToast } from '../../components/Toast'
import { Modal } from '../../components/Modal'
import { MovementModal } from '../../components/admin/MovementModal'
import { ProductImage } from '../../components/ProductImage'
import type { ProductAdminListItem } from '../../lib/types'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Select,
  Skeleton,
} from '../../components/ui'
import { cn } from '../../lib/cn'

const ESTADOS = [
  { value: '', label: 'Todos los estados' },
  { value: 'activo', label: 'Activos' },
  { value: 'inactivo', label: 'Inactivos' },
  { value: 'agotado', label: 'Agotados' },
  { value: 'stock_bajo', label: 'Stock bajo' },
]

export function Products() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [movementFor, setMovementFor] = useState<number | null>(null)
  const [toggleTarget, setToggleTarget] = useState<ProductAdminListItem | null>(null)

  const estado = searchParams.get('estado') ?? ''
  const familia = searchParams.get('familia') ?? ''
  const q = searchParams.get('q') ?? ''
  const page = Number(searchParams.get('page') ?? '1')

  const [search, setSearch] = useState(q)
  const debounced = useDebouncedValue(search, 350)

  useEffect(() => {
    setSearch(q)
  }, [q])

  useEffect(() => {
    if (debounced === q) return
    const next = new URLSearchParams(searchParams)
    if (debounced.trim()) next.set('q', debounced.trim())
    else next.delete('q')
    next.delete('page')
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  const { data: families = [] } = useQuery({
    queryKey: ['admin-families'],
    queryFn: api.admin.families,
    staleTime: 5 * 60 * 1000,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', { q, estado, familia, page }],
    queryFn: () =>
      api.admin.products({
        q: q || undefined,
        estado: estado || undefined,
        familia: familia || undefined,
        page,
        page_size: 20,
      }),
  })

  const toggleActive = useMutation({
    mutationFn: async (product: ProductAdminListItem) => {
      if (product.active) {
        return api.admin.deactivateProduct(product.id)
      }
      return api.admin.activateProduct(product.id)
    },
    onSuccess: (_, product) => {
      toast(product.active ? 'Producto desactivado del catálogo' : 'Producto activado en el catálogo')
      setToggleTarget(null)
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })
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
        title="Productos"
        description="Gestiona el catálogo, precios y presentaciones."
        actions={
          <Link to="/admin/productos/nuevo">
            <Button>
              <Plus className="h-4 w-4" />
              Nuevo producto
            </Button>
          </Link>
        }
      />

      <Card className="mb-5 p-4">
        <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre, SKU o marca…"
              className="pl-9"
            />
          </div>
          <Select value={estado} onChange={(event) => updateParam('estado', event.target.value)}>
            {ESTADOS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
          <Select value={familia} onChange={(event) => updateParam('familia', event.target.value)}>
            <option value="">Todas las familias</option>
            {families.map((item) => (
              <option key={item.id} value={item.slug}>
                {item.name}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={<Package className="h-8 w-8" />}
          title="No hay productos con esos filtros"
          description="Prueba con otro término de búsqueda o crea un nuevo producto."
          action={
            <Link to="/admin/productos/nuevo">
              <Button>
                <Plus className="h-4 w-4" />
                Crear producto
              </Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-sand-200 bg-white">
            <div className="hidden grid-cols-[minmax(0,2.2fr)_1fr_1fr_1fr_auto] gap-4 border-b border-sand-200 bg-sand-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted lg:grid">
              <span>Producto</span>
              <span>Familia</span>
              <span>Stock</span>
              <span>Precios</span>
              <span className="text-right">Acciones</span>
            </div>

            <ul className="divide-y divide-sand-200">
              {data.items.map((product) => (
                <li
                  key={product.id}
                  className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,2.2fr)_1fr_1fr_1fr_auto] lg:items-center"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-16 w-14 shrink-0 overflow-hidden rounded-xl bg-sand-100">
                      <ProductImage src={product.image_url} alt={product.name} className="h-full w-full" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate font-semibold text-ink">{product.name}</p>
                        {product.featured && (
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        )}
                      </div>
                      <p className="text-xs text-ink-muted">
                        {product.sku} · {productTypeLabel(product.product_type)}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {!product.active && <Badge tone="neutral">Inactivo</Badge>}
                        {product.active && !product.available && <Badge tone="danger">Agotado</Badge>}
                        {product.active && product.available && (
                          <Badge tone="success">Disponible</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-ink-muted lg:text-ink">
                    {product.family_name ?? '—'}
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span
                      className={cn(
                        'font-bold',
                        product.total_stock === 0 ? 'text-rose-600' : 'text-ink',
                      )}
                    >
                      {product.total_stock}
                    </span>
                    <span className="text-xs text-ink-muted">
                      en {product.presentation_count}{' '}
                      {product.presentation_count === 1 ? 'presentación' : 'presentaciones'}
                    </span>
                  </div>

                  <div className="text-sm font-semibold text-ink">
                    {priceRange(product.price_min, product.price_max)}
                  </div>

                  <div className="flex items-center justify-end gap-1">
                    <Link to={`/admin/productos/${product.id}`}>
                      <Button variant="outline" size="sm">
                        <Edit3 className="h-3.5 w-3.5" />
                        Editar
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMovementFor(product.id)}
                      title="Registrar movimiento de stock"
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setToggleTarget(product)}
                      title={product.active ? 'Desactivar visibilidad' : 'Activar visibilidad'}
                      aria-label={product.active ? 'Desactivar visibilidad' : 'Activar visibilidad'}
                    >
                      {product.active ? (
                        <EyeOff className="h-4 w-4 text-ink-muted hover:text-ink" />
                      ) : (
                        <Eye className="h-4 w-4 text-emerald-600 hover:text-emerald-700" />
                      )}
                    </Button>
                  </div>
                </li>
              ))}
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

      <div className="mt-6 flex items-start gap-2 rounded-xl border border-sand-200 bg-white p-4 text-xs text-ink-muted">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <p>
          Los precios se administran aquí, pero <strong>nunca</strong> se muestran en el catálogo
          público. Los clientes solo ven disponibilidad y consultan por WhatsApp.
        </p>
      </div>

      <MovementModal
        open={movementFor !== null}
        onClose={() => setMovementFor(null)}
        defaultItemType="presentacion"
      />

      <Modal
        open={toggleTarget !== null}
        onClose={() => {
          if (!toggleActive.isPending) setToggleTarget(null)
        }}
        title={toggleTarget?.active ? 'Desactivar producto' : 'Activar producto'}
        description={
          toggleTarget?.active
            ? 'El producto se ocultará de la tienda pública.'
            : 'El producto volverá a estar visible en la tienda pública.'
        }
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              disabled={toggleActive.isPending}
              onClick={() => setToggleTarget(null)}
            >
              Cancelar
            </Button>
            <Button
              variant={toggleTarget?.active ? 'danger' : 'primary'}
              loading={toggleActive.isPending}
              onClick={() => {
                if (toggleTarget) {
                  toggleActive.mutate(toggleTarget)
                }
              }}
            >
              {toggleTarget?.active ? 'Desactivar' : 'Activar'}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-ink-muted">
          <p>
            ¿Estás seguro de que deseas {toggleTarget?.active ? 'desactivar' : 'activar'} la visibilidad
            de <strong className="text-ink">{toggleTarget?.name}</strong>?
          </p>
          {toggleTarget?.active ? (
            <p className="rounded-xl border border-sand-200 bg-sand-50 p-3 text-xs leading-relaxed text-ink-muted">
              Al desactivarlo, dejará de aparecer en las búsquedas, categorías y listados de clientes.
              Las presentaciones y su stock se conservarán.
            </p>
          ) : (
            <p className="rounded-xl border border-sand-200 bg-sand-50 p-3 text-xs leading-relaxed text-ink-muted">
              Al activarlo, volverá a estar disponible para que los clientes puedan verlo y consultar
              por WhatsApp según el stock de sus presentaciones.
            </p>
          )}
        </div>
      </Modal>
    </>
  )
}
