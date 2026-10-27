import { Link } from 'react-router-dom'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { EmptyState } from '../components/ui'

export function NotFound() {
  useDocumentTitle('Página no encontrada | El Perfumista Rubio')

  return (
    <div className="container-page py-20">
      <EmptyState
        icon={<Sparkles className="h-8 w-8" />}
        title="Esta página no existe"
        description="Puede que el enlace haya cambiado o que la página ya no esté disponible."
        action={
          <Link
            to="/"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink-soft"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>
        }
      />
    </div>
  )
}
