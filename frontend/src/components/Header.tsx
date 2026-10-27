import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Instagram, Menu, MessageCircle, X } from 'lucide-react'
import { useSiteConfig } from '../context/SiteConfigContext'
import { whatsappLink } from '../lib/format'
import { cn } from '../lib/cn'

const NAV = [
  { to: '/', label: 'Inicio' },
  { to: '/catalogo', label: 'Catálogo' },
  { to: '/#nosotros', label: 'Nosotros' },
  { to: '/contacto', label: 'Contacto' },
]

export function Header() {
  const { config } = useSiteConfig()
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setOpen(false)
  }, [location.pathname, location.hash])

  const whatsapp = whatsappLink(
    config.whatsapp_primary,
    'Hola, quisiera consultar el catálogo de El Perfumista Rubio.',
  )

  return (
    <header className="sticky top-0 z-50">
      <div className="bg-ink text-center text-[11px] font-medium tracking-wide text-white/70">
        <div className="container-page flex items-center justify-center gap-2 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
          Atención personalizada por WhatsApp · {config.hours}
        </div>
      </div>

      <div className="glass border-b border-sand-200/80">
        <div className="container-page flex h-[72px] items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3" aria-label="El Perfumista Rubio, inicio">
            <span className="relative h-12 w-12 overflow-hidden rounded-full ring-2 ring-brand-400/40">
              <img src="/logo.png" alt="Logo de El Perfumista Rubio" className="h-full w-full object-cover" />
            </span>
            <span className="leading-none">
              <span className="block font-display text-xl font-semibold tracking-tight text-ink">
                El Perfumista
              </span>
              <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.28em] text-brand-700">
                Rubio · Perfumería
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'rounded-full px-4 py-2 text-sm font-semibold transition',
                    isActive
                      ? 'bg-sand-100 text-ink'
                      : 'text-ink-muted hover:bg-sand-100 hover:text-ink',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-soft sm:inline-flex"
            >
              <MessageCircle className="h-4 w-4 text-brand-400" />
              Escríbenos
            </a>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-sand-300 text-ink transition hover:bg-sand-100 lg:hidden"
              aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={open}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className="border-b border-sand-200 bg-white shadow-xl lg:hidden">
          <nav className="container-page flex flex-col gap-1 py-4">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'rounded-xl px-4 py-3 text-sm font-semibold transition',
                    isActive ? 'bg-sand-100 text-ink' : 'text-ink-muted hover:bg-sand-100',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            <div className="mt-3 flex gap-2">
              <a
                href={whatsapp}
                target="_blank"
                rel="noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-ink px-4 py-3 text-sm font-semibold text-white"
              >
                <MessageCircle className="h-4 w-4 text-brand-400" />
                WhatsApp
              </a>
              <a
                href={config.instagram_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-sand-300 text-ink"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
