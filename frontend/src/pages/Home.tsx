import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Instagram,
  MapPin,
  MessageCircle,
  Search,
  Sparkles,
} from 'lucide-react'
import { api } from '../lib/api'
import { useSiteConfig } from '../context/SiteConfigContext'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { whatsappLink } from '../lib/format'
import { ProductCard } from '../components/ProductCard'

function SectionTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-700">
          {eyebrow}
        </p>
        <h2 className="mt-2 max-w-2xl text-4xl leading-tight text-ink sm:text-5xl">{title}</h2>
        {description && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function Home() {
  const { config } = useSiteConfig()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  useDocumentTitle(
    'El Perfumista Rubio',
    'Catálogo de perfumes, esencias y cuidado personal. Consulta disponibilidad y recibe asesoría por WhatsApp.',
  )

  const { data: families } = useQuery({
    queryKey: ['families'],
    queryFn: api.families,
    staleTime: 5 * 60 * 1000,
  })

  const { data: featured } = useQuery({
    queryKey: ['products', 'featured-home'],
    queryFn: () => api.products({ destacado: true, page_size: 8, sort: 'recientes' }),
    staleTime: 60 * 1000,
  })

  const whatsapp = whatsappLink(
    config.whatsapp_primary,
    'Hola, vengo del catálogo web y quisiera recibir asesoría sobre sus fragancias.',
  )

  const words = config.hero_title.trim().split(' ')
  const lastWord = words.length > 1 ? words.pop() : ''
  const firstPart = words.join(' ')

  const onSearch = (event: FormEvent) => {
    event.preventDefault()
    const value = query.trim()
    navigate(value ? `/catalogo?q=${encodeURIComponent(value)}` : '/catalogo')
  }

  return (
    <>
      <section className="hero-glow relative overflow-hidden text-white">
        <div className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(circle_at_70%_30%,rgba(34,211,238,.12),transparent_45%)]" />
        <div className="container-page relative grid gap-14 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
          <div className="fade-up">
            <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.26em] text-brand-300">
              <span className="h-px w-10 bg-brand-400/70" />
              Perfumería artesanal
            </p>

            <h1 className="mt-6 max-w-2xl text-balance font-display text-5xl leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
              {firstPart} <span className="text-gradient">{lastWord}</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
              {config.hero_subtitle}
            </p>

            <form
              onSubmit={onSearch}
              className="mt-8 flex max-w-xl items-center gap-2 rounded-full border border-white/15 bg-white/10 p-1.5 backdrop-blur-md"
            >
              <Search className="ml-3 h-5 w-5 shrink-0 text-brand-300" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Busca por nombre, familia o nota…"
                className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none"
                aria-label="Buscar productos"
              />
              <button
                type="submit"
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-brand-500 px-5 text-sm font-bold text-ink transition hover:bg-brand-400"
              >
                Buscar
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            {families && families.length > 0 && (
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider text-white/40">Familias:</span>
                {families.slice(0, 5).map((family) => (
                  <Link
                    key={family.id}
                    to={`/catalogo?familia=${family.slug}`}
                    className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:border-brand-400/50 hover:text-white"
                  >
                    {family.name}
                  </Link>
                ))}
              </div>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/catalogo"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-ink transition hover:bg-brand-50"
              >
                Explorar catálogo
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href={whatsapp}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-white/20 px-6 text-sm font-semibold text-white transition hover:border-brand-400/60 hover:bg-white/5"
              >
                <MessageCircle className="h-4 w-4 text-brand-300" />
                Consultar por WhatsApp
              </a>
            </div>
          </div>

          <div className="relative mx-auto flex w-full max-w-md items-center justify-center lg:max-w-none">
            <div className="absolute h-64 w-64 rounded-full bg-brand-500/20 blur-3xl sm:h-80 sm:w-80" />
            <div className="absolute h-56 w-56 translate-x-20 translate-y-16 rounded-full bg-accent-600/25 blur-3xl" />

            <div className="animate-float relative">
              <div className="rounded-full border border-white/10 bg-white/5 p-3 backdrop-blur-md sm:p-4">
                <img
                  src="/logo.png"
                  alt="El Perfumista Rubio"
                  className="h-56 w-56 rounded-full object-cover shadow-2xl sm:h-72 sm:w-72 lg:h-80 lg:w-80"
                />
              </div>

              <div className="absolute -left-4 top-6 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 shadow-xl backdrop-blur-md sm:-left-8">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-300">
                  Disponibilidad
                </p>
                <p className="mt-1 text-sm font-semibold">En tiempo real</p>
              </div>

              <div className="absolute -right-3 bottom-8 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 shadow-xl backdrop-blur-md sm:-right-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent-300">
                  Asesoría
                </p>
                <p className="mt-1 text-sm font-semibold">Personalizada</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative border-t border-white/10">
          <div className="container-page grid grid-cols-2 divide-x divide-white/10 py-6 sm:grid-cols-4">
            {[
              { value: '2', label: 'Dos Locales' },
              { value: config.hours, label: 'Horario de atención' },
              { value: '17+', label: 'Fragancias en catálogo' },
              { value: '100%', label: 'Atención personalizada' },
            ].map((item) => (
              <div key={item.label} className="px-4 text-center first:pl-0 last:pr-0">
                <p className="font-display text-xl text-white sm:text-2xl">{item.value}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-white/40">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-16 sm:py-20">
        <SectionTitle
          eyebrow="Explora"
          title="Encuentra tu familia olfativa"
          description="Cada familia tiene una personalidad distinta. Filtra el catálogo y descubre las fragancias que mejor se adaptan a ti."
          action={
            <Link
              to="/catalogo"
              className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-800"
            >
              Ver todo el catálogo <ArrowUpRight className="h-4 w-4" />
            </Link>
          }
        />

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(families ?? []).map((family, index) => (
            <Link
              key={family.id}
              to={`/catalogo?familia=${family.slug}`}
              className="group relative overflow-hidden rounded-3xl border border-sand-200 bg-white p-6 transition hover:-translate-y-1 hover:border-brand-300 hover:shadow-xl hover:shadow-brand-900/5"
            >
              <div className="absolute -right-6 -top-8 font-display text-8xl text-sand-100 transition group-hover:text-brand-50">
                {String(index + 1).padStart(2, '0')}
              </div>
              <div className="relative">
                <div className="mb-8 inline-flex rounded-2xl bg-gradient-to-br from-brand-500/15 to-accent-500/15 p-3 text-brand-700">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="text-2xl text-ink">{family.name}</h3>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-muted">
                  {family.description}
                </p>
                <div className="mt-5 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                    {family.product_count} {family.product_count === 1 ? 'producto' : 'productos'}
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-brand-600 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="container-page">
          <SectionTitle
            eyebrow="Selección"
            title="Fragancias destacadas"
            description="Una muestra de nuestros aromas más consultados. Consulta disponibilidad y presentaciones directamente por WhatsApp."
            action={
              <Link
                to="/catalogo"
                className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-800"
              >
                Ver catálogo completo <ArrowUpRight className="h-4 w-4" />
              </Link>
            }
          />

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {(featured?.items ?? []).slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      <section id="nosotros" className="container-page py-16 sm:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="relative overflow-hidden rounded-[2rem] bg-ink p-8 text-white sm:p-12">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-500/20 blur-3xl" />
            <div className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-accent-600/25 blur-3xl" />
            <div className="relative">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-300">
                Nuestra esencia
              </p>
              <h2 className="mt-3 text-4xl leading-tight sm:text-5xl">
                Más que una perfumería, un lugar para encontrar tu aroma.
              </h2>
              <p className="mt-5 text-sm leading-relaxed text-white/65">{config.about_text}</p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {[
                  'Esencias de calidad',
                  'Frasquería fina',
                  'Asesoría personalizada',
                  'Dos locales para visitarte',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-white/80">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-400" />
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/contacto"
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-ink transition hover:bg-brand-50"
                >
                  Visítanos
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href={config.instagram_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-white/20 px-5 text-sm font-semibold text-white transition hover:bg-white/5"
                >
                  <Instagram className="h-4 w-4" />
                  Instagram
                </a>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: Search,
                title: 'Explora',
                text: 'Filtra por familia, tipo de producto, notas y presentación.',
              },
              {
                icon: CheckCircle2,
                title: 'Consulta',
                text: 'Verifica si está disponible y en qué tamaños lo tenemos.',
              },
              {
                icon: MessageCircle,
                title: 'Escríbenos',
                text: 'Resuelve tus dudas y coordina tu compra por WhatsApp.',
              },
              {
                icon: MapPin,
                title: 'Visítanos',
                text: 'Dos locales para atenderte en persona.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-sand-200 bg-white p-6 transition hover:border-brand-300 hover:shadow-lg"
              >
                <div className="inline-flex rounded-2xl bg-sand-100 p-3 text-brand-700">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-2xl text-ink">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="container-page">
          <SectionTitle
            eyebrow="Visítanos"
            title="Estamos cerca de ti"
            description="Acércate a cualquiera de nuestros locales o escríbenos para conocer la disponibilidad antes de tu visita."
          />

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {[
              { label: 'Local 1', address: config.location_1, coordinates: '7.688317,-72.370081', accent: 'from-brand-500/15 to-brand-500/5' },
              { label: 'Local 2', address: config.location_2, coordinates: '7.700673,-72.359773', accent: 'from-accent-500/15 to-accent-500/5' },
            ].map((location) => (
              <div
                key={location.label}
                className="relative overflow-hidden rounded-3xl border border-sand-200 bg-white p-7"
              >
                <div className={`absolute inset-x-0 top-0 h-28 bg-gradient-to-b ${location.accent}`} />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-700 shadow-sm">
                      {location.label}
                    </span>
                    <MapPin className="h-5 w-5 text-brand-600" />
                  </div>
                  <h3 className="mt-10 text-3xl text-ink">{location.address}</h3>
                  <p className="mt-2 flex items-center gap-2 text-sm text-ink-muted">
                    <Clock className="h-4 w-4 text-brand-600" />
                    {config.hours}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.coordinates)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-xs font-semibold text-white transition hover:bg-ink-soft"
                    >
                      Cómo llegar
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                    <a
                      href={whatsappLink(
                        config.whatsapp_primary,
                        `Hola, quisiera consultar la disponibilidad de productos en ${location.address}.`,
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-10 items-center gap-2 rounded-full border border-sand-300 px-4 text-xs font-semibold text-ink transition hover:border-brand-400 hover:text-brand-700"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Consultar
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page pb-20">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-600 via-brand-700 to-accent-800 px-8 py-12 text-white sm:px-12">
          <div className="absolute -right-10 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">
                Síguenos
              </p>
              <h2 className="mt-2 text-4xl leading-tight">Nuevos aromas, cada semana</h2>
              <p className="mt-2 text-sm text-white/75">
                Descubre lanzamientos, recomendaciones y promociones en nuestro Instagram.
              </p>
            </div>
            <a
              href={config.instagram_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-ink transition hover:bg-brand-50"
            >
              <Instagram className="h-4 w-4" />
              @elperfumistarubio.2023
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
