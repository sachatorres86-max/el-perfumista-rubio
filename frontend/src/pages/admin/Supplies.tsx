import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Boxes,
  Edit3,
  EyeOff,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react'
import { api } from '../../lib/api'
import type { Supply, SupplyCategory, SupplyInput, SupplyUnit } from '../../lib/types'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import {
  formatCOP,
  SUPPLY_CATEGORY_LABELS,
  SUPPLY_UNIT_LABELS,
} from '../../lib/format'
import { useToast } from '../../components/Toast'
import { Modal } from '../../components/Modal'
import { ConfirmModal } from '../../components/ConfirmModal'
import { MovementModal } from '../../components/admin/MovementModal'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  Skeleton,
  Textarea,
} from '../../components/ui'
import { cn } from '../../lib/cn'

const CATEGORIES: SupplyCategory[] = [
  'esencia',
  'fijador',
  'alcohol',
  'frasco',
  'accesorio',
  'otro',
]
const UNITS: SupplyUnit[] = ['ml', 'unidad', 'gr']

interface SupplyFormState {
  id?: number
  sku: string
  name: string
  category: SupplyCategory
  unit: SupplyUnit
  stock: string
  min_stock: string
  unit_cost_cop: string
  active: boolean
  notes: string
}

function emptyForm(): SupplyFormState {
  return {
    sku: '',
    name: '',
    category: 'esencia',
    unit: 'ml',
    stock: '0',
    min_stock: '0',
    unit_cost_cop: '0',
    active: true,
    notes: '',
  }
}

export function Supplies() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const debounced = useDebouncedValue(search, 350)
  const [category, setCategory] = useState(searchParams.get('categoria') ?? '')
  const [lowStock, setLowStock] = useState(searchParams.get('stock_bajo') === 'true')

  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<SupplyFormState>(emptyForm())
  const [movementFor, setMovementFor] = useState<Supply | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<Supply | null>(null)

  useEffect(() => {
    const next = new URLSearchParams()
    if (debounced.trim()) next.set('q', debounced.trim())
    if (category) next.set('categoria', category)
    if (lowStock) next.set('stock_bajo', 'true')
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, category, lowStock])

  const { data: supplies = [], isLoading } = useQuery({
    queryKey: ['admin-supplies', { q: debounced, categoria: category, stock_bajo: lowStock }],
    queryFn: () =>
      api.admin.supplies({
        q: debounced || undefined,
        categoria: category || undefined,
        stock_bajo: lowStock || undefined,
      }),
  })

  const saveMutation = useMutation({
    mutationFn: (payload: { id?: number; data: SupplyInput }) =>
      payload.id
        ? api.admin.updateSupply(payload.id, payload.data)
        : api.admin.createSupply(payload.data),
    onSuccess: () => {
      toast(form.id ? 'Insumo actualizado' : 'Insumo creado')
      queryClient.invalidateQueries({ queryKey: ['admin-supplies'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })
      setFormOpen(false)
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  const deactivate = useMutation({
    mutationFn: (id: number) => api.admin.deactivateSupply(id),
    onSuccess: () => {
      toast('Insumo desactivado')
      setDeactivateTarget(null)
      queryClient.invalidateQueries({ queryKey: ['admin-supplies'] })
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  const openCreate = () => {
    setForm(emptyForm())
    setFormOpen(true)
  }

  const openEdit = (supply: Supply) => {
    setForm({
      id: supply.id,
      sku: supply.sku,
      name: supply.name,
      category: supply.category,
      unit: supply.unit,
      stock: String(supply.stock),
      min_stock: String(supply.min_stock),
      unit_cost_cop: String(supply.unit_cost_cop),
      active: supply.active,
      notes: supply.notes ?? '',
    })
    setFormOpen(true)
  }

  const onSubmit = () => {
    if (!form.name.trim()) {
      toast('El nombre es obligatorio', 'error')
      return
    }
    const data: SupplyInput = {
      name: form.name.trim(),
      category: form.category,
      unit: form.unit,
      min_stock: Number(form.min_stock) || 0,
      unit_cost_cop: Number(form.unit_cost_cop) || 0,
      active: form.active,
      notes: form.notes.trim() || null,
    }
    if (!form.id) {
      data.sku = form.sku.trim() || undefined
      data.stock = Number(form.stock) || 0
    }
    saveMutation.mutate({ id: form.id, data })
  }

  return (
    <>
      <PageHeader
        title="Insumos"
        description="Esencias, fijadores, alcohol, frascos y accesorios."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nuevo insumo
          </Button>
        }
      />

      <Card className="mb-5 p-4">
        <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre o SKU…"
              className="pl-9"
            />
          </div>
          <Select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">Todas las categorías</option>
            {CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {SUPPLY_CATEGORY_LABELS[value]}
              </option>
            ))}
          </Select>
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-sand-300 bg-white px-3.5">
            <input
              type="checkbox"
              checked={lowStock}
              onChange={(event) => setLowStock(event.target.checked)}
              className="h-4 w-4 accent-brand-600"
            />
            <span className="text-sm font-medium text-ink">Solo stock bajo</span>
          </label>
        </div>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-20" />
          ))}
        </div>
      ) : supplies.length === 0 ? (
        <EmptyState
          icon={<Boxes className="h-8 w-8" />}
          title="No hay insumos"
          description="Agrega tus materias primas para controlar el stock."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Crear insumo
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-sand-200 bg-white">
          <div className="hidden grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_auto] gap-4 border-b border-sand-200 bg-sand-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted lg:grid">
            <span>Insumo</span>
            <span>Categoría</span>
            <span>Stock</span>
            <span>Costo unitario</span>
            <span className="text-right">Acciones</span>
          </div>
          <ul className="divide-y divide-sand-200">
            {supplies.map((supply) => (
              <li
                key={supply.id}
                className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_auto] lg:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="font-semibold text-ink">{supply.name}</p>
                    {supply.low_stock && <Badge tone="warning">Stock bajo</Badge>}
                    {!supply.active && <Badge tone="neutral">Inactivo</Badge>}
                  </div>
                  <p className="text-xs text-ink-muted">{supply.sku}</p>
                </div>
                <div className="text-sm text-ink-muted lg:text-ink">
                  {SUPPLY_CATEGORY_LABELS[supply.category]}
                </div>
                <div className="text-sm">
                  <span className={cn('font-bold', supply.low_stock ? 'text-amber-600' : 'text-ink')}>
                    {supply.stock}
                  </span>{' '}
                  <span className="text-xs text-ink-muted">
                    {SUPPLY_UNIT_LABELS[supply.unit]}
                  </span>
                  <span className="block text-[11px] text-ink-muted">
                    mín. {supply.min_stock}
                  </span>
                </div>
                <div className="text-sm font-semibold text-ink">
                  {formatCOP(supply.unit_cost_cop)}
                </div>
                <div className="flex items-center justify-end gap-1">
                  <Button variant="outline" size="sm" onClick={() => setMovementFor(supply)}>
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    Stock
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(supply)} title="Editar">
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeactivateTarget(supply)}
                    title="Desactivar"
                    aria-label={`Desactivar ${supply.name}`}
                  >
                    <EyeOff className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={form.id ? 'Editar insumo' : 'Nuevo insumo'}
        description="Controla materias primas y materiales de empaque."
        footer={
          <>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={onSubmit} loading={saveMutation.isPending}>
              Guardar
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" required className="sm:col-span-2">
            <Input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Ej. Esencia Vainilla"
            />
          </Field>
          <Field label="SKU" hint="Automático si se deja vacío.">
            <Input
              value={form.sku}
              onChange={(event) => setForm({ ...form, sku: event.target.value })}
              disabled={Boolean(form.id)}
              placeholder="INS-0001"
            />
          </Field>
          <Field label="Categoría">
            <Select
              value={form.category}
              onChange={(event) =>
                setForm({ ...form, category: event.target.value as SupplyCategory })
              }
            >
              {CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {SUPPLY_CATEGORY_LABELS[value]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Unidad">
            <Select
              value={form.unit}
              onChange={(event) => setForm({ ...form, unit: event.target.value as SupplyUnit })}
            >
              {UNITS.map((value) => (
                <option key={value} value={value}>
                  {SUPPLY_UNIT_LABELS[value]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Stock mínimo">
            <Input
              type="number"
              min={0}
              value={form.min_stock}
              onChange={(event) => setForm({ ...form, min_stock: event.target.value })}
            />
          </Field>
          {!form.id && (
            <Field label="Stock inicial">
              <Input
                type="number"
                min={0}
                value={form.stock}
                onChange={(event) => setForm({ ...form, stock: event.target.value })}
              />
            </Field>
          )}
          <Field label="Costo unitario (COP)">
            <Input
              type="number"
              min={0}
              value={form.unit_cost_cop}
              onChange={(event) => setForm({ ...form, unit_cost_cop: event.target.value })}
            />
          </Field>
          <Field label="Notas" className="sm:col-span-2">
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              placeholder="Proveedor, lote, observaciones…"
            />
          </Field>
          <label className="flex cursor-pointer items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => setForm({ ...form, active: event.target.checked })}
              className="h-4 w-4 accent-brand-600"
            />
            <span className="text-sm font-medium text-ink">Insumo activo</span>
          </label>
        </div>
      </Modal>

      <MovementModal
        open={movementFor !== null}
        onClose={() => setMovementFor(null)}
        defaultItemType="insumo"
        defaultSupplyId={movementFor?.id}
      />

      <ConfirmModal
        open={deactivateTarget !== null}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={() => {
          if (deactivateTarget) deactivate.mutate(deactivateTarget.id)
        }}
        title="Desactivar insumo"
        confirmText="Desactivar"
        variant="danger"
        loading={deactivate.isPending}
      >
        <p className="text-sm text-ink-muted">
          ¿Estás seguro de que deseas desactivar el insumo{' '}
          <strong className="text-ink">{deactivateTarget?.name}</strong>? Dejará de mostrarse en los
          selectores activos y en el listado general salvo que se filtre por inactivos.
        </p>
      </ConfirmModal>
    </>
  )
}
