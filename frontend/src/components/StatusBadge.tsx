import { Badge } from './ui'

export function AvailabilityBadge({ available }: { available: boolean }) {
  return available ? (
    <Badge tone="success" className="backdrop-blur">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Disponible
    </Badge>
  ) : (
    <Badge tone="neutral" className="backdrop-blur">
      <span className="h-1.5 w-1.5 rounded-full bg-ink-muted" />
      Agotado
    </Badge>
  )
}
