import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from 'lucide-react'
import { api } from '../lib/api'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { PRODUCT_TYPE_LABELS } from '../lib/format'
import { ProductCard } from '../components/ProductCard'
import { Badge, EmptyState, Skeleton } from '../components/ui'
import { cn } from '../lib/cn'

function FiltersContent({
  families,
  notes,
  values,
  onChange,
  onClear,
  onClose,
}: {
  families: Array<{ id: number; name: string; slug: string; product_count: number }>
  notes: Array<{ id: number; name: string; slug: string }>
  values: { familia: string; tipo: string; nota: string; disponible: boolean }
  onChange: (key: string, value: string | undefined) => void
  onClear: () => void
  onClose?: () => void
}) {
  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">Filtros</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-semibold text-brand-700 hover:text-brand-800"
          >
            Limpiar
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-ink-muted hover:bg-sand-100"
              aria-label="Cerrar filtros"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
          Familia olfativa
        </p>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => onChange('familia', undefined)}
            className={cn(
              'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition',
              !values.familia
                ? 'bg-brand-50 font-semibold text-brand-800'
                : 'text-ink-muted hover:bg-sand-100 hover:text-ink',
            )}
          >
            Todas las familias
          </button>
          {families.map((family) => (
            <button
              key={family.id}
              type="button"
              onClick={() => onChange('familia', family.slug)}
              className={cn(
                'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition',
                values.familia === family.slug
                  ? 'bg-brand-50 font-semibold text-brand-800'
                  : 'text-ink-muted hover:bg-sand-100 hover:text-ink',
              )}
            >
              <span>{family.name}</span>
              <span className="text-[11px] text-ink-muted/70">{family.product_count}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label
          htmlFor="filter-tipo"
          className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted"
        >
          Tipo de producto
        </label>
        <select
          id="filter-tipo"
          value={values.tipo}
          onChange={(event) => onChange('tipo', event.target.value || undefined)}
          className="h-11 w-full rounded-xl border border-sand-300 bg-white px-3 text-sm text-ink outline-none focus:border-brand-500"
        >
          <option value="">Todos los tipos</option>
          {Object.entries(PRODUCT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="filter-nota"
          className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted"
        >
          Nota olfativa
        </label>
        <select
          id="filter-nota"
          value={values.nota}
          onChange={(event) => onChange('nota', event.target.value || undefined)}
          className="h-11 w-full rounded-xl border border-sand-300 bg-white px-3 text-sm text-ink outline-none focus:border-brand-500"
        >
          <option value="">Cualquier nota</option>
          {notes.map((note) => (
            <option key={note.id} value={note.slug}>
              {note.name}
            </option>
          ))}
        </select>
      </div>

      <label className="flex cursor-pointer items-center justify-between rounded-xl border border-sand-200 bg-sand-50 px-3 py-3">
        <span className="text-sm font-medium text-ink">Solo disponibles</span>
        <input
          type="checkbox"
          checked={values.disponible}
          onChange={(event) => onChange('disponible', event.target.checked ? 'true' : undefined)}
          className="h-4 w-4 accent-brand-600"
        />
      </label>
    </div>
  )
}

export function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [mobileOpen, setMobileOpen] = useState(false)

  const q = searchParams.get('q') ?? ''
  const familia = searchParams.get('familia') ?? ''
  const tipo = searchParams.get('tipo') ?? ''
  const nota = searchParams.get('nota') ?? ''
  const disponible = searchParams.get('disponible') === 'true'
  const page = Number(searchParams.get('page') ?? '1')
  const sort = (searchParams.get('sort') as 'recientes' | 'nombre') ?? 'recientes'

  const [search, setSearch] = useState(q)
  const debouncedSearch = useDebouncedValue(search, 350)

  useDocumentTitle(
    'Catálogo | El Perfumista Rubio',
    'Explora perfumes, esencias y cuidado personal por familia olfativa, tipo, notas y disponibilidad.',
  )

  useEffect(() => {
    setSearch(q)
  }, [q])

  useEffect(() => {
    if (debouncedSearch === q) return
    const next = new URLSearchParams(searchParams)
    if (debouncedSearch.trim()) next.set('q', debouncedSearch.trim())
    else next.delete('q')
    next.delete('page')
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const updateParam = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setSearchParams(next)
  }

  const clearFilters = () => {
    setSearch('')
    setSearchParams({})
  }

  const { data: families = [] } = useQuery({
    queryKey: ['families'],
    queryFn: api.families,
    staleTime: 5 * 60 * 1000,
  })

  const { data: notes = [] } = useQuery({
    queryKey: ['notes'],
    queryFn: api.notes,
    staleTime: 5 * 60 * 1000,
  })

  const { data, isLoading, isError } = useQuery({
    queryKey: ['products', { q, familia, tipo, nota, disponible, page, sort }],
    queryFn: () =>
      api.products({
        q: q || undefined,
        familia: familia || undefined,
        tipo: tipo || undefined,
        nota: nota || undefined,
        disponible: disponible || undefined,
        page,
        page_size: 12,
        sort,
      }),
  })

  const activeFamily = families.find((family) => family.slug === familia)
  const activeNote = notes.find((note) => note.slug === nota)
  const hasFilters = Boolean(q || familia || tipo || nota || disponible)

  const filterValues = { familia, tipo, nota, disponible }

  return (
    <>
      <section className="border-b border-sand-200 bg-white">
        <div className="container-page py-10 sm:py-14">
          <nav className="flex items-center gap-2 text-xs text-ink-muted">
            <Link to="/" className="hover:text-brand-700">
              Inicio
            </Link>
            <span>/</span>
            <span className="text-ink">Catálogo</span>
          </nav>
          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-4xl leading-tight text-ink sm:text-5xl">Catálogo</h1>
              <p className="mt-2 max-w-2xl text-sm text-ink-muted">
                Perfumes, esencias y cuidado personal. Filtra por familia olfativa, notas o
                presentación y consulta la disponibilidad.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar producto…"
                  className="h-11 w-full rounded-full border border-sand-300 bg-white pl-9 pr-4 text-sm outline-none transition focus:border-brand-500"
                  aria-label="Buscar en el catálogo"
                />
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-sand-300 bg-white px-4 text-sm font-semibold text-ink lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filtros
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-10">
        <div className="grid gap-10 lg:grid-cols-[260px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-32 rounded-2xl border border-sand-200 bg-white p-5">
              <FiltersContent
                families={families}
                notes={notes}
                values={filterValues}
                onChange={updateParam}
                onClear={clearFilters}
              />
            </div>
          </aside>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-ink-muted">
                  {isLoading ? 'Buscando…' : `${data?.total ?? 0} resultados`}
                </span>
                {activeFamily && (
                  <Badge tone="brand">
                    {activeFamily.name}
                    <button
                      type="button"
                      onClick={() => updateParam('familia', undefined)}
                      aria-label="Quitar filtro de familia"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {activeNote && (
                  <Badge tone="accent">
                    {activeNote.name}
                    <button
                      type="button"
                      onClick={() => updateParam('nota', undefined)}
                      aria-label="Quitar filtro de nota"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {tipo && (
                  <Badge tone="neutral">
                    {PRODUCT_TYPE_LABELS[tipo as keyof typeof PRODUCT_TYPE_LABELS] ?? tipo}
                    <button
                      type="button"
                      onClick={() => updateParam('tipo', undefined)}
                      aria-label="Quitar filtro de tipo"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {disponible && (
                  <Badge tone="success">
                    Disponibles
                    <button
                      type="button"
                      onClick={() => updateParam('disponible', undefined)}
                      aria-label="Quitar filtro de disponibilidad"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {q && (
                  <Badge tone="neutral">
                    “{q}”
                    <button
                      type="button"
                      onClick={() => {
                        setSearch('')
                        updateParam('q', undefined)
                      }}
                      aria-label="Quitar búsqueda"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>

              <label className="flex items-center gap-2 text-xs text-ink-muted">
                Ordenar por
                <select
                  value={sort}
                  onChange={(event) => updateParam('sort', event.target.value)}
                  className="h-9 rounded-full border border-sand-300 bg-white px-3 text-xs font-semibold text-ink outline-none focus:border-brand-500"
                >
                  <option value="recientes">Más recientes</option>
                  <option value="nombre">Nombre A-Z</option>
                </select>
              </label>
            </div>

            {isError ? (
              <div className="mt-8">
                <EmptyState
                  title="No pudimos cargar el catálogo"
                  description="Revisa la conexión e inténtalo de nuevo."
                  action={
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white"
                    >
                      Reintentar
                    </button>
                  }
                />
              </div>
            ) : isLoading ? (
              <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="overflow-hidden rounded-3xl border border-sand-200 bg-white">
                    <Skeleton className="aspect-[4/5] rounded-none" />
                    <div className="space-y-3 p-5">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-6 w-40" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : data && data.items.length > 0 ? (
              <>
                <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {data.items.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {data.pages > 1 && (
                  <div className="mt-10 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateParam('page', String(Math.max(1, page - 1)))}
                      disabled={page <= 1}
                      className="inline-flex h-10 items-center gap-1 rounded-full border border-sand-300 px-4 text-sm font-semibold text-ink disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" /> Anterior
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: data.pages }).map((_, index) => {
                        const number = index + 1
                        return (
                          <button
                            key={number}
                            type="button"
                            onClick={() => updateParam('page', String(number))}
                            className={cn(
                              'h-10 w-10 rounded-full text-sm font-semibold transition',
                              number === page
                                ? 'bg-ink text-white'
                                : 'text-ink-muted hover:bg-sand-100',
                            )}
                          >
                            {number}
                          </button>
                        )
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => updateParam('page', String(Math.min(data.pages, page + 1)))}
                      disabled={page >= data.pages}
                      className="inline-flex h-10 items-center gap-1 rounded-full border border-sand-300 px-4 text-sm font-semibold text-ink disabled:opacity-40"
                    >
                      Siguiente <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="mt-8">
                <EmptyState
                  title="No encontramos fragancias con esos filtros"
                  description="Prueba con otra familia, nota o término de búsqueda."
                  action={
                    hasFilters ? (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white"
                      >
                        Limpiar filtros
                      </button>
                    ) : undefined
                  }
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {mobileOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            aria-label="Cerrar filtros"
            className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 w-full max-w-sm overflow-y-auto bg-white p-6 shadow-2xl">
            <FiltersContent
              families={families}
              notes={notes}
              values={filterValues}
              onChange={updateParam}
              onClear={clearFilters}
              onClose={() => setMobileOpen(false)}
            />
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="mt-8 h-11 w-full rounded-full bg-ink text-sm font-semibold text-white"
            >
              Ver resultados
            </button>
          </div>
        </div>
      )}
    </>
  )
}
