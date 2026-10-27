import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDownLeft, ArrowUpRight, SlidersHorizontal } from 'lucide-react'
import { api } from '../../lib/api'
import type { ItemType, MovementType } from '../../lib/types'
import { MOVEMENT_TYPE_LABELS } from '../../lib/format'
import { useToast } from '../Toast'
import { Modal } from '../Modal'
import { Button, Field, Input, Select, Textarea } from '../ui'
import { cn } from '../../lib/cn'

export function MovementModal({
  open,
  onClose,
  defaultItemType = 'presentacion',
  defaultPresentationId,
  defaultSupplyId,
}: {
  open: boolean
  onClose: () => void
  defaultItemType?: ItemType
  defaultPresentationId?: number
  defaultSupplyId?: number
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [itemType, setItemType] = useState<ItemType>(defaultItemType)
  const [movementType, setMovementType] = useState<MovementType>('entrada')
  const [presentationId, setPresentationId] = useState<string>(
    defaultPresentationId ? String(defaultPresentationId) : '',
  )
  const [supplyId, setSupplyId] = useState<string>(
    defaultSupplyId ? String(defaultSupplyId) : '',
  )
  const [quantity, setQuantity] = useState('1')
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (!open) return
    setItemType(defaultItemType)
    setMovementType('entrada')
    setPresentationId(defaultPresentationId ? String(defaultPresentationId) : '')
    setSupplyId(defaultSupplyId ? String(defaultSupplyId) : '')
    setQuantity('1')
    setReason('')
  }, [open, defaultItemType, defaultPresentationId, defaultSupplyId])

  const { data: presentations = [] } = useQuery({
    queryKey: ['presentation-options'],
    queryFn: () => api.admin.presentationOptions(),
    enabled: open && itemType === 'presentacion',
    staleTime: 60 * 1000,
  })

  const { data: supplies = [] } = useQuery({
    queryKey: ['admin-supplies', 'movement'],
    queryFn: () => api.admin.supplies({ activo: true }),
    enabled: open && itemType === 'insumo',
    staleTime: 60 * 1000,
  })

  const selectedPresentation = useMemo(
    () => presentations.find((item) => String(item.id) === presentationId),
    [presentations, presentationId],
  )

  const selectedSupply = useMemo(
    () => supplies.find((item) => String(item.id) === supplyId),
    [supplies, supplyId],
  )

  const mutation = useMutation({
    mutationFn: api.admin.createMovement,
    onSuccess: () => {
      toast('Movimiento registrado')
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['admin-movements'] })
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      queryClient.invalidateQueries({ queryKey: ['admin-supplies'] })
      queryClient.invalidateQueries({ queryKey: ['report-summary'] })
      onClose()
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  const currentStock = itemType === 'presentacion' ? selectedPresentation?.stock : selectedSupply?.stock
  const quantityNumber = Number(quantity)

  const resulting = useMemo(() => {
    if (currentStock === undefined || Number.isNaN(quantityNumber)) return null
    if (movementType === 'entrada') return currentStock + quantityNumber
    if (movementType === 'salida') return currentStock - quantityNumber
    return quantityNumber
  }, [currentStock, quantityNumber, movementType])

  const onSubmit = () => {
    if (itemType === 'presentacion' && !presentationId) {
      toast('Selecciona una presentación', 'error')
      return
    }
    if (itemType === 'insumo' && !supplyId) {
      toast('Selecciona un insumo', 'error')
      return
    }
    if (quantityNumber < 0 || (movementType !== 'ajuste' && quantityNumber <= 0)) {
      toast('Ingresa una cantidad válida', 'error')
      return
    }

    mutation.mutate({
      item_type: itemType,
      presentation_id: itemType === 'presentacion' ? Number(presentationId) : null,
      supply_id: itemType === 'insumo' ? Number(supplyId) : null,
      movement_type: movementType,
      quantity: quantityNumber,
      reason: reason.trim() || null,
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar movimiento"
      description="Entradas, salidas y ajustes de inventario."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} loading={mutation.isPending}>
            Guardar movimiento
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            Tipo de artículo
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(['presentacion', 'insumo'] as ItemType[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setItemType(value)
                  setQuantity('1')
                }}
                className={cn(
                  'rounded-xl border px-3 py-2.5 text-sm font-semibold transition',
                  itemType === value
                    ? 'border-brand-500 bg-brand-50 text-brand-800'
                    : 'border-sand-300 bg-white text-ink-muted hover:border-brand-300',
                )}
              >
                {value === 'presentacion' ? 'Producto terminado' : 'Insumo'}
              </button>
            ))}
          </div>
        </div>

        <Field label={itemType === 'presentacion' ? 'Presentación' : 'Insumo'} required>
          {itemType === 'presentacion' ? (
            <Select value={presentationId} onChange={(event) => setPresentationId(event.target.value)}>
              <option value="">Selecciona una presentación…</option>
              {presentations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label} · stock {item.stock}
                </option>
              ))}
            </Select>
          ) : (
            <Select value={supplyId} onChange={(event) => setSupplyId(event.target.value)}>
              <option value="">Selecciona un insumo…</option>
              {supplies.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · stock {item.stock} {item.unit}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            Tipo de movimiento
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(['entrada', 'salida', 'ajuste'] as MovementType[]).map((value) => {
              const Icon =
                value === 'entrada' ? ArrowDownLeft : value === 'salida' ? ArrowUpRight : SlidersHorizontal
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMovementType(value)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs font-semibold transition',
                    movementType === value
                      ? 'border-brand-500 bg-brand-50 text-brand-800'
                      : 'border-sand-300 bg-white text-ink-muted hover:border-brand-300',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {MOVEMENT_TYPE_LABELS[value]}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={movementType === 'ajuste' ? 'Stock final' : 'Cantidad'}
            hint={
              movementType === 'ajuste'
                ? 'El stock quedará exactamente en este valor.'
                : undefined
            }
          >
            <Input
              type="number"
              min={0}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </Field>

          <div className="rounded-xl border border-sand-200 bg-sand-50 px-3.5 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Stock resultante
            </p>
            <p
              className={cn(
                'mt-1 text-xl font-bold',
                resulting !== null && resulting < 0 ? 'text-rose-600' : 'text-ink',
              )}
            >
              {resulting === null ? '—' : resulting}
            </p>
            <p className="text-[11px] text-ink-muted">
              Actual: {currentStock ?? '—'}
            </p>
          </div>
        </div>

        <Field label="Motivo" hint="Opcional. Ej. venta, compra, merma, conteo físico.">
          <Textarea
            rows={2}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Detalle del movimiento…"
            maxLength={255}
          />
        </Field>
      </div>
    </Modal>
  )
}
