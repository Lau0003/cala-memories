import { useState } from 'react'
import { Link, NavLink, Navigate, Outlet } from 'react-router-dom'
import Logo from '../components/Logo'
import { useAuth } from '../lib/auth'

const NAV: { to: string; label: string; end?: boolean; soon?: boolean }[] = [
  { to: '/admin', label: 'Resumen', end: true },
  { to: '/admin/productos', label: 'Productos' },
  { to: '/admin/categorias', label: 'Categorías' },
  { to: '/admin/ordenes', label: 'Órdenes', soon: true },
  { to: '/admin/tareas', label: 'Tareas', soon: true },
  { to: '/admin/cotizador', label: 'Cotizador', soon: true },
  { to: '/admin/inventario', label: 'Inventario', soon: true },
  { to: '/admin/lanzamientos', label: 'Lanzamientos', soon: true },
  { to: '/admin/contenido', label: 'Contenido', soon: true },
  { to: '/admin/ajustes', label: 'Ajustes' },
]

export default function AdminLayout() {
  const { loading, userId, admin, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  if (loading) {
    return (
      <div className="admin-center">
        <p className="muted">Cargando…</p>
      </div>
    )
  }

  if (!userId) return <Navigate to="/admin/login" replace />

  if (!admin) {
    return (
      <div className="admin-center">
        <div className="card card--narrow">
          <h1>Este usuario no tiene acceso al panel</h1>
          <p className="muted">
            Iniciaste sesión, pero tu usuario no está en la lista de administradores. Agrégalo con
            el archivo <code>supabase/crear-admins.sql</code>.
          </p>
          <button type="button" className="btn btn--dark" onClick={signOut}>
            Cerrar sesión
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="admin">
      <aside className="admin-side">
        <div className="admin-side__top">
          <Link to="/admin" aria-label="Panel CaLa memories">
            <Logo tone="claro" />
          </Link>
          <button
            type="button"
            className="admin-side__toggle"
            aria-expanded={menuOpen}
            aria-controls="admin-menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            Menú
          </button>
        </div>

        <nav
          id="admin-menu"
          className={`admin-nav ${menuOpen ? 'is-open' : ''}`}
          aria-label="Panel"
        >
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setMenuOpen(false)}>
              {item.label}
              {item.soon && <span className="admin-nav__soon">Pronto</span>}
            </NavLink>
          ))}
          <div className="admin-nav__foot">
            <a href="/" target="_blank" rel="noopener noreferrer">
              Ver la tienda
            </a>
            <button type="button" onClick={signOut}>
              Cerrar sesión ({admin.display_name})
            </button>
          </div>
        </nav>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}
