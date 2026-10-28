import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Check,
  ImagePlus,
  Plus,
  Save,
  Sparkles,
  Star,
  Trash2,
  X,
} from 'lucide-react'
import { api } from '../../lib/api'
import type { NoteType, ProductInput, ProductType } from '../../lib/types'
import { GENDERS, PRODUCT_TYPES } from '../../lib/constants'
import { NOTE_TYPE_LABELS, formatCOP } from '../../lib/format'
import { useToast } from '../../components/Toast'
import { ProductImage } from '../../components/ProductImage'
import { ConfirmModal } from '../../components/ConfirmModal'
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  Select,
  Spinner,
  Textarea,
} from '../../components/ui'
import { cn } from '../../lib/cn'

interface PresentationRow {
  key: string
  id?: number
  volume_ml: string
  bottle_type: string
  price_cop: string
  stock: string
  min_stock: string
  active: boolean
}

const NOTE_TYPES: NoteType[] = ['salida', 'corazon', 'fondo']

function newRow(): PresentationRow {
  return {
    key: crypto.randomUUID(),
    volume_ml: '',
    bottle_type: '',
    price_cop: '',
    stock: '0',
    min_stock: '3',
    active: true,
  }
}

export function ProductForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [brand, setBrand] = useState('El Perfumista Rubio')
  const [productType, setProductType] = useState<ProductType>('contratipo')
  const [familyId, setFamilyId] = useState('')
  const [concentration, setConcentration] = useState('')
  const [gender, setGender] = useState('')
  const [shortDescription, setShortDescription] = useState('')
  const [description, setDescription] = useState('')
  const [active, setActive] = useState(true)
  const [featured, setFeatured] = useState(false)
  const [notes, setNotes] = useState<Array<{ note_id: number; note_type: NoteType }>>([])
  const [presentations, setPresentations] = useState<PresentationRow[]>([newRow()])
  const [images, setImages] = useState<Array<{ id: number; path: string }>>([])
  const [uploading, setUploading] = useState(false)
  const [deleteImageTarget, setDeleteImageTarget] = useState<number | null>(null)
  const [deletingImage, setDeletingImage] = useState(false)

  const { data: families = [] } = useQuery({
    queryKey: ['admin-families'],
    queryFn: api.admin.families,
    staleTime: 5 * 60 * 1000,
  })

  const { data: allNotes = [] } = useQuery({
    queryKey: ['admin-notes'],
    queryFn: api.admin.notes,
    staleTime: 5 * 60 * 1000,
  })

  const { data: product, isLoading } = useQuery({
    queryKey: ['admin-product', id],
    queryFn: () => api.admin.product(Number(id)),
    enabled: isEdit,
  })

  useEffect(() => {
    if (!product) return
    setName(product.name)
    setSku(product.sku)
    setBrand(product.brand ?? '')
    setProductType(product.product_type)
    setFamilyId(product.family_id ? String(product.family_id) : '')
    setConcentration(product.concentration ?? '')
    setGender(product.gender ?? '')
    setShortDescription(product.short_description ?? '')
    setDescription(product.description ?? '')
    setActive(product.active)
    setFeatured(product.featured)
    setNotes(product.notes.map((note) => ({ note_id: note.note_id, note_type: note.note_type })))
    setPresentations(
      product.presentations.map((presentation) => ({
        key: crypto.randomUUID(),
        id: presentation.id,
        volume_ml: String(presentation.volume_ml),
        bottle_type: presentation.bottle_type ?? '',
        price_cop: String(presentation.price_cop),
        stock: String(presentation.stock),
        min_stock: String(presentation.min_stock),
        active: presentation.active,
      })),
    )
    setImages(product.images.map((image) => ({ id: image.id, path: image.path })))
  }, [product])

  const saveMutation = useMutation({
    mutationFn: (payload: ProductInput) =>
      isEdit ? api.admin.updateProduct(Number(id), payload) : api.admin.createProduct(payload),
    onSuccess: (saved) => {
      toast(isEdit ? 'Producto actualizado' : 'Producto creado')
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['admin-product', id] })
      if (!isEdit) {
        navigate(`/admin/productos/${saved.id}`)
      }
    },
    onError: (error: Error) => toast(error.message, 'error'),
  })

  const notesByType = useMemo(() => {
    const grouped: Record<NoteType, number[]> = { salida: [], corazon: [], fondo: [] }
    for (const link of notes) {
      grouped[link.note_type].push(link.note_id)
    }
    return grouped
  }, [notes])

  const toggleNote = (noteId: number, type: NoteType) => {
    setNotes((current) => {
      const exists = current.some(
        (link) => link.note_id === noteId && link.note_type === type,
      )
      if (exists) {
        return current.filter(
          (link) => !(link.note_id === noteId && link.note_type === type),
        )
      }
      return [...current, { note_id: noteId, note_type: type }]
    })
  }

  const updateRow = (key: string, field: keyof PresentationRow, value: string | boolean) => {
    setPresentations((current) =>
      current.map((row) => (row.key === key ? { ...row, [field]: value } : row)),
    )
  }

  const removeRow = (key: string) => {
    setPresentations((current) => {
      if (current.length === 1) return current
      return current.filter((row) => row.key !== key)
    })
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) {
      toast('El nombre es obligatorio', 'error')
      return
    }

    const validRows = presentations.filter((row) => Number(row.volume_ml) > 0)
    if (active && validRows.length === 0) {
      toast('Agrega al menos una presentación para publicar el producto', 'error')
      return
    }

    const payload: ProductInput = {
      name: name.trim(),
      sku: sku.trim() || undefined,
      brand: brand.trim() || null,
      product_type: productType,
      family_id: familyId ? Number(familyId) : null,
      concentration: concentration.trim() || null,
      gender: gender || null,
      short_description: shortDescription.trim() || null,
      description: description.trim() || null,
      active,
      featured,
      notes,
      presentations: presentations
        .filter((row) => Number(row.volume_ml) > 0)
        .map((row) => ({
          id: row.id,
          volume_ml: Number(row.volume_ml),
          bottle_type: row.bottle_type.trim() || null,
          price_cop: Number(row.price_cop) || 0,
          stock: Number(row.stock) || 0,
          min_stock: Number(row.min_stock) || 0,
          active: row.active,
        })),
    }

    saveMutation.mutate(payload)
  }

  const onUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    if (!isEdit) {
      toast('Guarda el producto antes de subir imágenes', 'info')
      return
    }
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const image = await api.admin.uploadImage(Number(id), file)
        setImages((current) => [...current, { id: image.id, path: image.path }])
      }
      toast('Imagen subida')
      queryClient.invalidateQueries({ queryKey: ['admin-product', id] })
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No se pudo subir la imagen', 'error')
    } finally {
      setUploading(false)
    }
  }

  const onDeleteImage = async (imageId: number) => {
    if (!isEdit) return
    setDeleteImageTarget(imageId)
  }

  const confirmDeleteImage = async () => {
    if (!deleteImageTarget || !isEdit) return
    setDeletingImage(true)
    try {
      await api.admin.deleteImage(Number(id), deleteImageTarget)
      setImages((current) => current.filter((image) => image.id !== deleteImageTarget))
      toast('Imagen eliminada')
      queryClient.invalidateQueries({ queryKey: ['admin-product', id] })
      setDeleteImageTarget(null)
    } catch (error) {
      toast(error instanceof Error ? error.message : 'No se pudo eliminar', 'error')
    } finally {
      setDeletingImage(false)
    }
  }

  if (isEdit && isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit}>
      <PageHeader
        title={isEdit ? 'Editar producto' : 'Nuevo producto'}
        description={
          isEdit
            ? 'Actualiza la información, presentaciones y disponibilidad.'
            : 'Completa los datos para agregar una fragancia al catálogo.'
        }
        actions={
          <>
            <Link to="/admin/productos">
              <Button type="button" variant="outline">
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
            </Link>
            <Button type="submit" loading={saveMutation.isPending}>
              <Save className="h-4 w-4" />
              {isEdit ? 'Guardar cambios' : 'Crear producto'}
            </Button>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="text-xl text-ink">Información general</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Nombre" required className="sm:col-span-2">
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ej. Baccarat Rouge 540"
                  required
                />
              </Field>

              <Field label="SKU" hint="Se genera automáticamente si lo dejas vacío.">
                <Input
                  value={sku}
                  onChange={(event) => setSku(event.target.value)}
                  placeholder="PRD-0001"
                />
              </Field>

              <Field label="Marca">
                <Input
                  value={brand}
                  onChange={(event) => setBrand(event.target.value)}
                  placeholder="El Perfumista Rubio"
                />
              </Field>

              <Field label="Tipo de producto" required>
                <Select
                  value={productType}
                  onChange={(event) => setProductType(event.target.value as ProductType)}
                >
                  {PRODUCT_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Familia olfativa">
                <Select value={familyId} onChange={(event) => setFamilyId(event.target.value)}>
                  <option value="">Sin familia</option>
                  {families.map((family) => (
                    <option key={family.id} value={family.id}>
                      {family.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Concentración">
                <Input
                  value={concentration}
                  onChange={(event) => setConcentration(event.target.value)}
                  placeholder="Eau de parfum"
                />
              </Field>

              <Field label="Género">
                <Select value={gender} onChange={(event) => setGender(event.target.value)}>
                  <option value="">Sin especificar</option>
                  {GENDERS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="Descripción corta"
                hint="Se muestra en las tarjetas del catálogo."
                className="sm:col-span-2"
              >
                <Textarea
                  rows={2}
                  value={shortDescription}
                  onChange={(event) => setShortDescription(event.target.value)}
                  maxLength={280}
                  placeholder="Una frase que describa la fragancia…"
                />
              </Field>

              <Field label="Descripción completa" className="sm:col-span-2">
                <Textarea
                  rows={5}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Historia, notas y ocasiones de uso…"
                />
              </Field>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-sand-200 bg-sand-50 px-3.5 py-2.5">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(event) => setActive(event.target.checked)}
                  className="h-4 w-4 accent-brand-600"
                />
                <span className="text-sm font-medium text-ink">Publicado en el catálogo</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-sand-200 bg-sand-50 px-3.5 py-2.5">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(event) => setFeatured(event.target.checked)}
                  className="h-4 w-4 accent-accent-600"
                />
                <span className="flex items-center gap-1 text-sm font-medium text-ink">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  Destacado
                </span>
              </label>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl text-ink">Notas olfativas</h2>
                <p className="text-xs text-ink-muted">
                  Selecciona las notas que componen la fragancia.
                </p>
              </div>
            </div>

            {allNotes.length === 0 ? (
              <p className="mt-4 text-sm text-ink-muted">
                No hay notas creadas. Agrégalas en{' '}
                <Link to="/admin/categorias" className="font-semibold text-brand-700">
                  Catálogo
                </Link>
                .
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {NOTE_TYPES.map((type) => (
                  <div key={type}>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                      {NOTE_TYPE_LABELS[type]}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {allNotes.map((note) => {
                        const selected = notesByType[type].includes(note.id)
                        return (
                          <button
                            key={`${type}-${note.id}`}
                            type="button"
                            onClick={() => toggleNote(note.id, type)}
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition',
                              selected
                                ? 'border-brand-500 bg-brand-50 text-brand-800'
                                : 'border-sand-200 bg-white text-ink-muted hover:border-brand-300',
                            )}
                          >
                            {selected && <Check className="h-3 w-3" />}
                            {note.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl text-ink">Presentaciones</h2>
                <p className="text-xs text-ink-muted">
                  Define tamaño, precio y stock. Los precios no se publican.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPresentations((current) => [...current, newRow()])}
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              {presentations.map((row, index) => (
                <div
                  key={row.key}
                  className="rounded-xl border border-sand-200 bg-sand-50/60 p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                      Presentación {index + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 text-[11px] font-medium text-ink-muted">
                        <input
                          type="checkbox"
                          checked={row.active}
                          onChange={(event) =>
                            updateRow(row.key, 'active', event.target.checked)
                          }
                          className="h-3.5 w-3.5 accent-brand-600"
                        />
                        Activa
                      </label>
                      <button
                        type="button"
                        onClick={() => removeRow(row.key)}
                        disabled={presentations.length === 1}
                        className="rounded-full p-1 text-ink-muted transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
                        aria-label="Eliminar presentación"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                    <Field label="Volumen (ml)">
                      <Input
                        type="number"
                        min={1}
                        value={row.volume_ml}
                        onChange={(event) => updateRow(row.key, 'volume_ml', event.target.value)}
                        placeholder="50"
                      />
                    </Field>
                    <Field label="Precio COP">
                      <Input
                        type="number"
                        min={0}
                        value={row.price_cop}
                        onChange={(event) => updateRow(row.key, 'price_cop', event.target.value)}
                        placeholder="65000"
                      />
                    </Field>
                    <Field label="Stock">
                      <Input
                        type="number"
                        min={0}
                        value={row.stock}
                        onChange={(event) => updateRow(row.key, 'stock', event.target.value)}
                      />
                    </Field>
                    <Field label="Stock mínimo">
                      <Input
                        type="number"
                        min={0}
                        value={row.min_stock}
                        onChange={(event) => updateRow(row.key, 'min_stock', event.target.value)}
                      />
                    </Field>
                    <Field label="Frasco">
                      <Input
                        value={row.bottle_type}
                        onChange={(event) =>
                          updateRow(row.key, 'bottle_type', event.target.value)
                        }
                        placeholder="Vidrio con válvula"
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-3 text-xs text-ink-muted">
              Si editas el stock de una presentación existente, se registrará un ajuste en el
              historial.
            </p>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="text-xl text-ink">Imágenes</h2>
            <p className="text-xs text-ink-muted">
              La primera imagen se usa como portada. JPG, PNG o WebP.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {images.map((image, index) => (
                <div
                  key={image.id}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-sand-200 bg-sand-100"
                >
                  <ProductImage src={image.path} alt={`Imagen ${index + 1}`} className="h-full w-full" />
                  {index === 0 && (
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-ink/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                      Portada
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onDeleteImage(image.id)}
                    className="absolute right-1.5 top-1.5 rounded-full bg-rose-600/90 p-1 text-white opacity-0 transition group-hover:opacity-100"
                    aria-label="Eliminar imagen"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}

              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-sand-300 bg-sand-50 text-ink-muted transition hover:border-brand-400 hover:text-brand-700">
                <ImagePlus className="h-6 w-6" />
                <span className="text-[11px] font-semibold">
                  {uploading ? 'Subiendo…' : 'Subir imagen'}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    onUpload(event.target.files)
                    event.target.value = ''
                  }}
                  disabled={uploading}
                />
              </label>
            </div>

            {!isEdit && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-800">
                Guarda el producto primero para poder subir imágenes.
              </p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="text-xl text-ink">Resumen</h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-muted">Estado</span>
                {active ? <Badge tone="success">Publicado</Badge> : <Badge tone="neutral">Borrador</Badge>}
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Presentaciones</span>
                <span className="font-semibold text-ink">
                  {presentations.filter((row) => Number(row.volume_ml) > 0).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Stock total</span>
                <span className="font-semibold text-ink">
                  {presentations.reduce((sum, row) => sum + (Number(row.stock) || 0), 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Rango de precios</span>
                <span className="font-semibold text-ink">
                  {(() => {
                    const prices = presentations
                      .map((row) => Number(row.price_cop))
                      .filter((value) => value > 0)
                    if (prices.length === 0) return '—'
                    const min = Math.min(...prices)
                    const max = Math.max(...prices)
                    return min === max ? formatCOP(min) : `${formatCOP(min)} – ${formatCOP(max)}`
                  })()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Notas</span>
                <span className="font-semibold text-ink">{notes.length}</span>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-brand-50 p-3 text-[11px] leading-relaxed text-brand-900">
              <Sparkles className="mb-1 inline h-3.5 w-3.5" /> Recuerda: el catálogo público solo
              muestra <strong>Disponible</strong> o <strong>Agotado</strong>, nunca precios.
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Link to="/admin/productos">
          <Button type="button" variant="ghost">
            Cancelar
          </Button>
        </Link>
        <Button type="submit" loading={saveMutation.isPending}>
          <Save className="h-4 w-4" />
          {isEdit ? 'Guardar cambios' : 'Crear producto'}
        </Button>
      </div>

      <ConfirmModal
        open={deleteImageTarget !== null}
        onClose={() => setDeleteImageTarget(null)}
        onConfirm={confirmDeleteImage}
        title="Eliminar imagen"
        confirmText="Eliminar"
        variant="danger"
        loading={deletingImage}
      >
        <p className="text-sm text-ink-muted">
          ¿Estás seguro de que deseas eliminar esta imagen del producto? Esta acción no se puede deshacer.
        </p>
      </ConfirmModal>
    </form>
  )
}
