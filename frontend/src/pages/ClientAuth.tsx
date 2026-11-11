import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, LockKeyhole, LogOut, Mail, UserRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { Button, Card, Field, Input, Spinner } from '../components/ui'

type Mode = 'login' | 'register'

function SessionCard() {
  const { user, logout } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  if (!user) return null

  const isStaff = user.role === 'admin' || user.role === 'vendedor'

  const handleLogout = async () => {
    await logout()
    toast('Sesión cerrada', 'info')
    navigate('/cuenta/ingresar', { replace: true })
  }

  return (
    <Card className="mx-auto mt-10 w-full max-w-md p-6 sm:p-8">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200">
          <UserRound className="h-6 w-6" />
        </span>
        <h1 className="mt-4 font-display text-2xl text-ink">Hola, {user.name}</h1>
        <p className="mt-1 text-sm text-ink-muted">{user.email}</p>
        <span className="mt-3 rounded-full bg-sand-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
          {isStaff ? 'Personal' : 'Cliente'}
        </span>
      </div>

      <div className="mt-6 space-y-2">
        {isStaff ? (
          <Link
            to="/admin"
            className="flex w-full items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink-soft"
          >
            Ir al panel interno
          </Link>
        ) : (
          <Link
            to="/catalogo"
            className="flex w-full items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink-soft"
          >
            Explorar el catálogo
          </Link>
        )}
        <Button variant="outline" className="w-full" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </Button>
      </div>
    </Card>
  )
}

function ClientAuthForm({ mode }: { mode: Mode }) {
  const { user, loading, login, register } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const isRegister = mode === 'register'

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (user && user.role !== 'cliente') {
    return <Navigate to="/admin" replace />
  }

  if (user) {
    return (
      <div className="container-page py-10">
        <SessionCard />
      </div>
    )
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')

    if (isRegister && password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setSubmitting(true)
    try {
      if (isRegister) {
        const current = await register({ name: name.trim(), email: email.trim(), password })
        toast(`Bienvenida, ${current.name}`, 'success')
      } else {
        const current = await login(email.trim(), password)
        if (current.role !== 'cliente') {
          navigate('/admin', { replace: true })
          return
        }
        toast(`Bienvenida, ${current.name}`, 'success')
      }
      navigate('/catalogo', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la solicitud')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container-page py-10 sm:py-14">
      <div className="mx-auto max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-ink-muted transition hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </Link>

        <Card className="mt-5 p-6 sm:p-8">
          <div className="text-center">
            <h1 className="font-display text-3xl text-ink">
              {isRegister ? 'Crea tu cuenta' : 'Inicia sesión'}
            </h1>
            <p className="mt-2 text-sm text-ink-muted">
              {isRegister
                ? 'Guarda tus fragancias favoritas y comparte tu carrito con tu vendedor.'
                : 'Accede para armar tu carrito y enviar tu cotización por WhatsApp.'}
            </p>
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {isRegister && (
              <Field label="Nombre completo" required>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Tu nombre"
                    autoComplete="name"
                    minLength={2}
                    maxLength={120}
                    required
                    className="pl-10"
                  />
                </div>
              </Field>
            )}

            <Field label="Correo electrónico" required>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="tu@correo.com"
                  autoComplete="email"
                  required
                  className="pl-10"
                />
              </div>
            </Field>

            <Field
              label="Contraseña"
              required
              hint={isRegister ? 'Mínimo 8 caracteres.' : undefined}
            >
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  minLength={isRegister ? 8 : 4}
                  maxLength={128}
                  required
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-ink-muted transition hover:text-ink"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            {isRegister && (
              <Field label="Confirmar contraseña" required>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    required
                    className="pl-10"
                  />
                </div>
              </Field>
            )}

            {error && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                {error}
              </p>
            )}

            <Button type="submit" loading={submitting} size="lg" className="w-full">
              {isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-ink-muted">
            {isRegister ? '¿Ya tienes cuenta?' : '¿Aún no tienes cuenta?'}{' '}
            <Link
              to={isRegister ? '/cuenta/ingresar' : '/cuenta/registro'}
              className="font-semibold text-brand-700 hover:text-brand-800"
            >
              {isRegister ? 'Inicia sesión' : 'Regístrate'}
            </Link>
          </p>
        </Card>

        <p className="mt-5 text-center text-xs text-ink-muted">
          ¿Eres parte del personal?{' '}
          <Link to="/admin/login" className="font-semibold text-ink hover:text-brand-700">
            Acceso interno
          </Link>
        </p>
      </div>
    </div>
  )
}

export function ClientLogin() {
  return <ClientAuthForm mode="login" />
}

export function ClientRegister() {
  return <ClientAuthForm mode="register" />
}
