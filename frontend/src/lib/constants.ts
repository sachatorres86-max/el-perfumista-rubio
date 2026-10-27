import type { PublicConfig } from './types'

export const FALLBACK_CONFIG: PublicConfig = {
  business_name: 'El Perfumista Rubio',
  whatsapp_primary: '+584126402721',
  whatsapp_secondary: '+584126402175',
  hours: '9:00 a.m. – 6:00 p.m.',
  instagram_url: 'https://www.instagram.com/elperfumistarubio.2023',
  location_1: 'Calle 1, El Poblado',
  location_2: 'Centro – San Martín',
  hero_title: 'Fragancias que dejan huella',
  hero_subtitle:
    'Perfumes, esencias y cuidado personal seleccionados para cada estilo. Consulta disponibilidad y recibe asesoría personalizada.',
  about_text:
    'En El Perfumista Rubio creamos y seleccionamos fragancias para acompañarte en cada momento. Trabajamos con esencias de calidad, frasquería fina y una atención cercana para ayudarte a encontrar tu aroma ideal.',
}

export const PRODUCT_TYPES = [
  { value: 'contratipo', label: 'Contratipo' },
  { value: 'esencia', label: 'Esencia' },
  { value: 'perfume_arabe', label: 'Perfume árabe' },
  { value: 'body_splash', label: 'Body splash' },
  { value: 'cuidado_personal', label: 'Cuidado personal' },
] as const

export const GENDERS = [
  { value: 'femenino', label: 'Femenino' },
  { value: 'masculino', label: 'Masculino' },
  { value: 'unisex', label: 'Unisex' },
] as const
