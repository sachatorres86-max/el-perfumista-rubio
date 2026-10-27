import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  CheckCircle2,
  Info,
  MessageCircle,
  Share2,
  Sparkles,
  XCircle,
} from 'lucide-react'
import { api } from '../lib/api'
import { useSiteConfig } from '../context/SiteConfigContext'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import {
  genderLabel,
  NOTE_TYPE_DESCRIPTIONS,
  NOTE_TYPE_LABELS,
  productTypeLabel,
  whatsappLink,
} from '../lib/format'
import { ProductImage } from '../components/ProductImage'
import { ProductCard } from '../components/ProductCard'
import { AvailabilityBadge } from '../components/StatusBadge'
import { Badge, EmptyState, Skeleton } from '../components/ui'
import { useToast } from '../components/Toast'
import { cn } from '../lib/cn'
import type { NoteType } from '../lib/types'

const NOTE_ORDER: NoteType[] = ['salida', 'corazon', 'fondo']

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { config } = useSiteConfig()
  const { toast } = useToast()
  const [activeImage, setActiveImage] = useState(0)
  const [selectedVolume, setSelectedVolume] = useState<number | null>(null)

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => api.product(slug!),
    enabled: Boolean(slug),
  })

  useDocumentTitle(
    product ? `${product.name} | El Perfumista Rubio` : 'Producto | El Perfumista Rubio',
    product?.short_description ?? undefined,
  )

  useEffect(() => {
    if (!product) return
    setActiveImage(0)
    const firstAvailable = product.presentations.find((presentation) => presentation.available)
    setSelectedVolume(firstAvailable?.volume_ml ?? product.presentations[0]?.volume_ml ?? null)
  }, [product?.id])

  if (isLoading) {
    return (
      <div className="container-page py-12">
        <div className="grid gap-10 lg:grid-cols-2">
          <Skeleton className="aspect-[4/5] w-full rounded-3xl" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-14 w-full rounded-full" />
          </div>
        </div>
      </div>
    )
  }

  if (isError || !product) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={<Sparkles className="h-8 w-8" />}
          title="No encontramos esta fragancia"
          description="Puede que ya no esté disponible o que el enlace sea incorrecto."
          action={
            <Link
              to="/catalogo"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al catálogo
            </Link>
          }
        />
      </div>
    )
  }

  const gallery = product.images.length
    ? product.images
    : product.image_url
      ? [product.image_url]
      : []

  const selectedPresentation = product.presentations.find(
    (presentation) => presentation.volume_ml === selectedVolume,
  )

  const message = selectedPresentation
    ? selectedPresentation.available
      ? `Hola, me interesa ${product.name} en presentación de ${selectedPresentation.volume_ml} ml. ¿Está disponible?`
      : `Hola, quisiera consultar si ${product.name} en ${selectedPresentation.volume_ml} ml estará disponible.`
    : `Hola, quisiera consultar la disponibilidad de ${product.name}.`

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast('Enlace copiado al portapapeles')
    } catch {
      toast('No se pudo copiar el enlace', 'error')
    }
  }

  return (
    <>
      <section className="border-b border-sand-200 bg-white">
        <div className="container-page py-6">
          <nav className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
            <Link to="/" className="hover:text-brand-700">
              Inicio
            </Link>
            <span>/</span>
            <Link to="/catalogo" className="hover:text-brand-700">
              Catálogo
            </Link>
            <span>/</span>
            <span className="text-ink">{product.name}</span>
          </nav>
        </div>
      </section>

      <section className="container-page py-10 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <div className="relative overflow-hidden rounded-[2rem] border border-sand-200 bg-sand-100">
              <div className="aspect-[4/5]">
                <ProductImage
                  src={gallery[activeImage]}
                  alt={product.name}
                  eager
                  className="h-full w-full"
                />
              </div>
              <div className="absolute left-4 top-4">
                <AvailabilityBadge available={product.available} />
              </div>
              {product.featured && (
                <div className="absolute right-4 top-4">
                  <Badge tone="accent">
                    <Sparkles className="h-3 w-3" />
                    Destacado
                  </Badge>
                </div>
              )}
            </div>

            {gallery.length > 1 && (
              <div className="mt-4 flex gap-3 overflow-x-auto pb-1 hide-scrollbar">
                {gallery.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    className={cn(
                      'h-24 w-20 shrink-0 overflow-hidden rounded-2xl border-2 transition',
                      index === activeImage
                        ? 'border-brand-500'
                        : 'border-transparent opacity-70 hover:opacity-100',
                    )}
                    aria-label={`Ver imagen ${index + 1}`}
                  >
                    <ProductImage src={image} alt={product.name} className="h-full w-full" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              {product.family && <Badge tone="brand">{product.family.name}</Badge>}
              <Badge tone="neutral">{productTypeLabel(product.product_type)}</Badge>
              {product.gender && <Badge tone="neutral">{genderLabel(product.gender)}</Badge>}
            </div>

            <h1 className="mt-4 text-balance font-display text-5xl leading-[0.95] text-ink sm:text-6xl">
              {product.name}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
              {product.brand && <span>{product.brand}</span>}
              {product.concentration && (
                <>
                  <span className="h-1 w-1 rounded-full bg-sand-300" />
                  <span>{product.concentration}</span>
                </>
              )}
            </div>

            {product.short_description && (
              <p className="mt-5 text-base leading-relaxed text-ink-muted">
                {product.short_description}
              </p>
            )}

            <div
              className={cn(
                'mt-6 flex items-start gap-3 rounded-2xl border p-4',
                product.available
                  ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
                  : 'border-sand-200 bg-sand-50 text-ink-muted',
              )}
            >
              {product.available ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              ) : (
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-ink-muted" />
              )}
              <div>
                <p className="text-sm font-semibold">
                  {product.available ? 'Disponible para consulta' : 'Temporalmente agotado'}
                </p>
                <p className="mt-0.5 text-xs opacity-80">
                  {product.available
                    ? 'Escríbenos por WhatsApp para confirmar tu presentación y coordinar la entrega.'
                    : 'Escríbenos para avisarte cuando vuelva a estar disponible.'}
                </p>
              </div>
            </div>

            <div className="mt-7">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
                Presentaciones
              </p>
              {product.presentations.length > 0 ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {product.presentations.map((presentation) => (
                    <button
                      key={presentation.id}
                      type="button"
                      onClick={() => setSelectedVolume(presentation.volume_ml)}
                      className={cn(
                        'flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition',
                        selectedVolume === presentation.volume_ml
                          ? 'border-brand-500 bg-brand-50/60 ring-2 ring-brand-500/20'
                          : 'border-sand-200 bg-white hover:border-brand-300',
                      )}
                    >
                      <div>
                        <p className="text-sm font-bold text-ink">{presentation.volume_ml} ml</p>
                        {presentation.bottle_type && (
                          <p className="text-[11px] text-ink-muted">{presentation.bottle_type}</p>
                        )}
                      </div>
                      <Badge tone={presentation.available ? 'success' : 'neutral'}>
                        {presentation.available ? 'Disponible' : 'Agotado'}
                      </Badge>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-ink-muted">
                  Consulta las presentaciones disponibles por WhatsApp.
                </p>
              )}
            </div>

            <div className="mt-7 flex flex-col gap-2 sm:flex-row">
              <a
                href={whatsappLink(config.whatsapp_primary, message)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-13 flex-1 items-center justify-center gap-2 rounded-full bg-accent-600 px-6 text-sm font-bold text-white shadow-lg shadow-accent-600/25 transition hover:bg-accent-700"
              >
                <MessageCircle className="h-4 w-4" />
                Consultar por WhatsApp
              </a>
              <button
                type="button"
                onClick={share}
                className="inline-flex h-13 items-center justify-center gap-2 rounded-full border border-sand-300 px-5 text-sm font-semibold text-ink transition hover:border-brand-400 hover:text-brand-700"
              >
                <Share2 className="h-4 w-4" />
                Compartir
              </button>
            </div>

            <p className="mt-4 flex items-start gap-2 text-xs text-ink-muted">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
              Los precios, promociones y formas de pago se consultan directamente por WhatsApp.
            </p>
          </div>
        </div>
      </section>

      {(product.description || Object.values(product.notes).some((items) => items.length > 0)) && (
        <section className="bg-white py-14">
          <div className="container-page">
            {product.description && (
              <div className="mx-auto max-w-3xl text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-700">
                  La fragancia
                </p>
                <h2 className="mt-2 text-4xl text-ink">Una historia en tres tiempos</h2>
                <p className="mt-4 text-sm leading-relaxed text-ink-muted">{product.description}</p>
              </div>
            )}

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {NOTE_ORDER.map((type) => {
                const notes = product.notes[type] ?? []
                if (!notes.length) return null
                return (
                  <div key={type} className="rounded-3xl border border-sand-200 bg-sand-50/60 p-6">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700">
                        {NOTE_TYPE_LABELS[type]}
                      </p>
                      <span className="font-display text-2xl text-sand-300">
                        {String(NOTE_ORDER.indexOf(type) + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-ink-muted">{NOTE_TYPE_DESCRIPTIONS[type]}</p>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {notes.map((note) => (
                        <span
                          key={note.id}
                          className="rounded-full border border-sand-200 bg-white px-3 py-1.5 text-xs font-medium text-ink"
                        >
                          {note.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {product.related.length > 0 && (
        <section className="container-page py-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-700">
                Sigue explorando
              </p>
              <h2 className="mt-2 text-4xl text-ink">También te puede interesar</h2>
            </div>
            <Link
              to="/catalogo"
              className="hidden text-sm font-semibold text-brand-700 hover:text-brand-800 sm:inline-flex"
            >
              Ver catálogo
            </Link>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {product.related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </>
  )
}
