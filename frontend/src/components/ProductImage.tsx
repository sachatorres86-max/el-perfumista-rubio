import { useState } from 'react'
import { FlaskConical } from 'lucide-react'
import { cn } from '../lib/cn'
import { initials } from '../lib/format'

const GRADIENTS = [
  'from-[#071a1f] via-[#0e4b57] to-[#1b0b2e]',
  'from-[#120a24] via-[#4c1d95] to-[#0b1220]',
  'from-[#1b0710] via-[#7c2d12] to-[#120a24]',
  'from-[#04161c] via-[#0e7490] to-[#1b0b2e]',
  'from-[#1a0b1f] via-[#831843] to-[#0b1220]',
]

function gradientFor(seed: string): string {
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 997
  }
  return GRADIENTS[hash % GRADIENTS.length]
}

export function ProductImage({
  src,
  alt,
  className,
  eager = false,
}: {
  src: string | null | undefined
  alt: string
  className?: string
  eager?: boolean
}) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div
        className={cn(
          'relative flex items-center justify-center overflow-hidden bg-gradient-to-br',
          gradientFor(alt),
          className,
        )}
        aria-label={alt}
      >
        <div className="absolute inset-0 opacity-40 [background:radial-gradient(circle_at_30%_20%,rgba(34,211,238,.35),transparent_45%),radial-gradient(circle_at_75%_80%,rgba(139,92,246,.45),transparent_50%)]" />
        <div className="relative flex flex-col items-center gap-2 text-white/80">
          <FlaskConical className="h-8 w-8" strokeWidth={1.4} />
          <span className="font-display text-3xl tracking-wide">{initials(alt)}</span>
        </div>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
      className={cn('h-full w-full object-cover', className)}
    />
  )
}
