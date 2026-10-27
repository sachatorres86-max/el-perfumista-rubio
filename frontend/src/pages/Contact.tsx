import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  Clock,
  Instagram,
  MapPin,
  MessageCircle,
  Send,
} from 'lucide-react'
import { useSiteConfig } from '../context/SiteConfigContext'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { whatsappLink } from '../lib/format'
import { Button, Card, Field, Input, Select, Textarea } from '../components/ui'

const REASONS = [
  'Consulta de disponibilidad',
  'Asesoría de fragancia',
  'Pedido o compra',
  'Mayoristas',
  'Otro',
]

export function Contact() {
  const { config } = useSiteConfig()
  const [reason, setReason] = useState(REASONS[0])
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')

  useDocumentTitle(
    'Contacto | El Perfumista Rubio',
    'Visítanos en Calle 1, El Poblado o Centro – San Martín. Escríbenos por WhatsApp de 9:00 a.m. a 6:00 p.m.',
  )

  const composed = [
    `Hola, mi nombre es ${name || '…'}.`,
    `Motivo: ${reason}.`,
    message ? message : 'Quisiera recibir más información.',
  ].join(' ')

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    window.open(whatsappLink(config.whatsapp_primary, composed), '_blank', 'noreferrer')
  }

  return (
    <>
      <section className="hero-glow relative overflow-hidden text-white">
        <div className="container-page relative py-14 sm:py-20">
          <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.26em] text-brand-300">
            <span className="h-px w-10 bg-brand-400/70" />
            Contacto
          </p>
          <h1 className="mt-5 max-w-2xl text-5xl leading-[0.95] sm:text-6xl">
            Hablemos de <span className="text-gradient">tu aroma</span>
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
            Escríbenos por WhatsApp o visítanos en cualquiera de nuestros dos locales. Te ayudamos a
            encontrar la fragancia que mejor se adapta a ti.
          </p>
        </div>
      </section>

      <section className="container-page py-14 sm:py-20">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center gap-3">
                <span className="rounded-2xl bg-brand-50 p-3 text-brand-700">
                  <MessageCircle className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
                    WhatsApp
                  </p>
                  <p className="text-sm font-semibold text-ink">Atención directa</p>
                </div>
              </div>
              <div className="mt-5 space-y-2">
                {[config.whatsapp_primary, config.whatsapp_secondary].map((phone) => (
                  <a
                    key={phone}
                    href={whatsappLink(phone, 'Hola, quisiera recibir asesoría sobre sus fragancias.')}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-xl border border-sand-200 bg-sand-50 px-4 py-3 text-sm font-semibold text-ink transition hover:border-brand-300 hover:bg-brand-50/50"
                  >
                    {phone}
                    <ArrowUpRight className="h-4 w-4 text-brand-600" />
                  </a>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3">
                <span className="rounded-2xl bg-accent-50 p-3 text-accent-700">
                  <Clock className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
                    Horario
                  </p>
                  <p className="text-sm font-semibold text-ink">{config.hours}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3">
                <span className="rounded-2xl bg-ink/5 p-3 text-ink">
                  <Instagram className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
                    Instagram
                  </p>
                  <a
                    href={config.instagram_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold text-ink hover:text-brand-700"
                  >
                    @elperfumistarubio.2023
                  </a>
                </div>
              </div>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: 'Local 1', address: config.location_1, coordinates: '7.688317,-72.370081' },
                { label: 'Local 2', address: config.location_2, coordinates: '7.700673,-72.359773' },
              ].map((location) => (
                <Card key={location.label} className="p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-700">
                    {location.label}
                  </p>
                  <p className="mt-2 flex items-start gap-2 text-sm font-semibold text-ink">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                    {location.address}
                  </p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.coordinates)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800"
                  >
                    Cómo llegar <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                </Card>
              ))}
            </div>
          </div>

          <Card className="h-fit p-6 sm:p-8">
            <h2 className="text-3xl text-ink">Escríbenos</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Completa el formulario y te llevaremos directo a WhatsApp con tu mensaje listo.
            </p>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <Field label="Tu nombre">
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="¿Cómo te llamas?"
                  maxLength={80}
                />
              </Field>

              <Field label="Motivo de contacto">
                <Select value={reason} onChange={(event) => setReason(event.target.value)}>
                  {REASONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Mensaje">
                <Textarea
                  rows={5}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Cuéntanos qué fragancia buscas o qué duda tienes…"
                  maxLength={600}
                />
              </Field>

              <Button type="submit" className="w-full" size="lg">
                <Send className="h-4 w-4" />
                Enviar por WhatsApp
              </Button>

              <p className="text-center text-xs text-ink-muted">
                También puedes escribirnos directamente a{' '}
                <a
                  href={whatsappLink(config.whatsapp_primary, 'Hola, quisiera consultar.')}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-brand-700"
                >
                  {config.whatsapp_primary}
                </a>
              </p>
            </form>

            <div className="mt-8 border-t border-sand-200 pt-6">
              <p className="text-xs text-ink-muted">
                ¿Buscas una fragancia específica?{' '}
                <Link to="/catalogo" className="font-semibold text-brand-700 hover:text-brand-800">
                  Explora el catálogo
                </Link>{' '}
                y consulta la disponibilidad antes de escribirnos.
              </p>
            </div>
          </Card>
        </div>
      </section>
    </>
  )
}
