import { Link } from 'react-router-dom'
import { Clock, Instagram, MapPin, MessageCircle } from 'lucide-react'
import { useSiteConfig } from '../context/SiteConfigContext'
import { whatsappLink } from '../lib/format'

export function Footer() {
  const { config } = useSiteConfig()
  const whatsapp = whatsappLink(
    config.whatsapp_primary,
    'Hola, quisiera consultar el catálogo de El Perfumista Rubio.',
  )

  return (
    <footer className="bg-ink text-white">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-12 w-12 overflow-hidden rounded-full ring-2 ring-brand-400/40">
              <img src="/logo.png" alt="Logo de El Perfumista Rubio" className="h-full w-full object-cover" />
            </span>
            <div>
              <p className="font-display text-2xl leading-none">El Perfumista</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-brand-300">
                Rubio · Perfumería
              </p>
            </div>
          </div>
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/60">
            Perfumes, esencias y cuidado personal con atención cercana. Encuentra tu aroma y
            consulta disponibilidad por WhatsApp.
          </p>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
            Navegación
          </h3>
          <ul className="mt-4 space-y-2.5 text-sm text-white/70">
            <li><Link to="/" className="transition hover:text-white">Inicio</Link></li>
            <li><Link to="/catalogo" className="transition hover:text-white">Catálogo</Link></li>
            <li><Link to="/#nosotros" className="transition hover:text-white">Nosotros</Link></li>
            <li><Link to="/contacto" className="transition hover:text-white">Contacto</Link></li>
            <li><Link to="/admin" className="transition hover:text-white">Acceso administrativo</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
            Contacto
          </h3>
          <ul className="mt-4 space-y-3 text-sm text-white/70">
            <li className="flex gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
              <span>
                {config.location_1}
                <br />
                {config.location_2}
              </span>
            </li>
            <li className="flex gap-2.5">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
              <span>{config.hours}</span>
            </li>
            <li className="flex gap-2.5">
              <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
              <a href={whatsapp} target="_blank" rel="noreferrer" className="transition hover:text-white">
                {config.whatsapp_primary}
                <br />
                {config.whatsapp_secondary}
              </a>
            </li>
            <li className="flex gap-2.5">
              <Instagram className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
              <a
                href={config.instagram_url}
                target="_blank"
                rel="noreferrer"
                className="transition hover:text-white"
              >
                @elperfumistarubio.2023
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
            Visítanos
          </h3>
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-300">
                Local 1
              </p>
              <p className="mt-1 text-sm text-white/80">{config.location_1}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-300">
                Local 2
              </p>
              <p className="mt-1 text-sm text-white/80">{config.location_2}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-white/40 sm:flex-row">
          <p>© {new Date().getFullYear()} El Perfumista Rubio. Todos los derechos reservados.</p>
          <p>Hecho con cariño para nuestra comunidad.</p>
        </div>
      </div>
    </footer>
  )
}
