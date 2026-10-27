import { MessageCircle } from 'lucide-react'
import { useSiteConfig } from '../context/SiteConfigContext'
import { whatsappLink } from '../lib/format'

export function WhatsAppFloat() {
  const { config } = useSiteConfig()
  const href = whatsappLink(
    config.whatsapp_primary,
    'Hola, quisiera consultar la disponibilidad de un producto.',
  )

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Consultar por WhatsApp"
      className="fixed bottom-5 right-5 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-2xl shadow-emerald-900/30 transition hover:scale-105 hover:bg-[#1ebe5b]"
    >
      <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-[#25D366]/40" />
      <MessageCircle className="h-6 w-6" />
    </a>
  )
}
