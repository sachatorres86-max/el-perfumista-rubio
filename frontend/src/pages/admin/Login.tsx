import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/Toast'
import { Button, Field, Input, Spinner } from '../../components/ui'

export function Login() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <Spinner className="h-8 w-8 text-brand-400" />
      </div>
    )
  }

  if (user) {
    return <Navigate to="/admin" replace />
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const current = await login(email.trim(), password)
      toast(`Bienvenido, ${current.name}`)
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="hero-glow flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-white/60 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al sitio
          </a>
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-300">
            Acceso interno
          </span>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="flex flex-col items-center text-center">
            <span className="h-16 w-16 overflow-hidden rounded-full ring-2 ring-brand-400/40">
              <img src="/logo.png" alt="El Perfumista Rubio" className="h-full w-full object-cover" />
            </span>
            <h1 className="mt-4 text-3xl text-white">El Perfumista Rubio</h1>
            <p className="mt-1 text-sm text-white/50">Panel de administración</p>
          </div>

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            <label className="block space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
                Correo electrónico
              </span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="tu@correo.com"
                  autoComplete="username"
                  required
                  className="border-white/15 bg-white/10 pl-10 text-white placeholder:text-white/30 focus:border-brand-400"
                />
              </div>
            </label>

            <label className="block space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
                Contraseña
              </span>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="border-white/15 bg-white/10 pl-10 pr-10 text-white placeholder:text-white/30 focus:border-brand-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-white/40 transition hover:text-white"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            {error && (
              <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-200">
                {error}
              </p>
            )}

            <Button type="submit" loading={submitting} size="lg" className="w-full">
              Iniciar sesión
            </Button>
          </form>
        </div>

        <p className="mt-5 text-center text-xs text-white/30">
          Acceso exclusivo para personal autorizado de El Perfumista Rubio.
        </p>
      </div>
    </div>
  )
}
