import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings as SettingsIcon,
  Tags,
  X,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/cn'
import { initials } from '../../lib/format'
import { Spinner } from '../../components/ui'

const NAV = [
  { to: '/admin', label: 'Panel', icon: LayoutDashboard, end: true },
  { to: '/admin/productos', label: 'Productos', icon: Package },
  { to: '/admin/insumos', label: 'Insumos', icon: Boxes },
  { to: '/admin/inventario', label: 'Inventario', icon: BarChart3 },
  { to: '/admin/categorias', label: 'Catálogo', icon: Tags },
  { to: '/admin/reportes', label: 'Reportes', icon: BarChart3 },
  { to: '/admin/configuracion', label: 'Configuración', icon: SettingsIcon },
]

export function AdminLayout() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!loading && !user) {
      navigate('/admin/login', { replace: true })
    }
  }, [loading, user, navigate])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sand-50">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!user) return null

  const handleLogout = async () => {
    await logout()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-sand-50 lg:flex">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-ink text-white transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-[72px] items-center justify-between border-b border-white/10 px-5">
          <Link to="/admin" className="flex items-center gap-3">
            <span className="h-10 w-10 overflow-hidden rounded-full ring-2 ring-brand-400/40">
              <img src="/logo.png" alt="Logo" className="h-full w-full object-cover" />
            </span>
            <span>
              <span className="block font-display text-lg leading-none">El Perfumista</span>
              <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.24em] text-brand-300">
                Panel interno
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full p-1.5 text-white/60 hover:bg-white/10 lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition',
                  isActive
                    ? 'bg-brand-500/15 text-brand-200 ring-1 ring-inset ring-brand-400/30'
                    : 'text-white/60 hover:bg-white/5 hover:text-white',
                )
              }
            >
              <item.icon className="h-4.5 w-4.5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-ink">
              {initials(user.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-[11px] capitalize text-white/50">{user.role}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full p-2 text-white/50 transition hover:bg-white/10 hover:text-white"
              aria-label="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          <Link
            to="/"
            className="mt-2 flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-white/50 transition hover:bg-white/5 hover:text-white"
          >
            Ver sitio público
          </Link>
        </div>
      </aside>

      {open && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-40 bg-ink/50 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-[72px] items-center gap-3 border-b border-sand-200 bg-white/90 px-4 backdrop-blur lg:px-8">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-sand-300 text-ink lg:hidden"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
              Administración
            </p>
          </div>
          <span className="hidden rounded-full bg-brand-50 px-3 py-1.5 text-[11px] font-semibold text-brand-700 ring-1 ring-inset ring-brand-200 sm:inline-flex">
            {user.role === 'admin' ? 'Administrador' : 'Vendedor'}
          </span>
        </header>

        <main className="px-4 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
