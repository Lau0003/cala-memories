import { Fragment, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import Logo from '../components/Logo'
import { useAuth } from '../lib/auth'

const NAV: { to: string; label: string; end?: boolean; group?: string }[] = [
  { to: '/admin', label: 'Resumen', end: true },
  { to: '/admin/ordenes', label: 'Órdenes', group: 'Día a día' },
  { to: '/admin/tareas', label: 'Tareas' },
  { to: '/admin/productos', label: 'Productos', group: 'Catálogo' },
  { to: '/admin/categorias', label: 'Categorías' },
  { to: '/admin/cotizador', label: 'Cotizador', group: 'Costos' },
  { to: '/admin/inventario', label: 'Inventario' },
  { to: '/admin/lanzamientos', label: 'Lanzamientos', group: 'Marketing' },
  { to: '/admin/contenido', label: 'Contenido' },
  { to: '/admin/ajustes', label: 'Ajustes', group: 'Tienda' },
]

export default function AdminLayout() {
  const { loading, userId, admin, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

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
            <Fragment key={item.to}>
              {item.group && <span className="admin-nav__group">{item.group}</span>}
              <NavLink to={item.to} end={item.end} onClick={() => setMenuOpen(false)}>
                {item.label}
              </NavLink>
            </Fragment>
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
        <div key={location.pathname} className="page-enter">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
