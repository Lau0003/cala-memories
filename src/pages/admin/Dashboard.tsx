import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { useSettings } from '../../lib/settings'
import { supabase } from '../../lib/supabase'

export default function Dashboard() {
  const { admin } = useAuth()
  const { settings } = useSettings()
  const [published, setPublished] = useState<number | null>(null)
  const [drafts, setDrafts] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    supabase
      .from('products')
      .select('published')
      .then(({ data }) => {
        if (!active) return
        const rows = (data as { published: boolean }[] | null) ?? []
        setPublished(rows.filter((r) => r.published).length)
        setDrafts(rows.filter((r) => !r.published).length)
      })
    return () => {
      active = false
    }
  }, [])

  const checklist = [
    {
      done: Boolean(settings.whatsapp_number),
      label: 'Agregar el número de WhatsApp',
      to: '/admin/ajustes',
    },
    {
      done: settings.payment_methods.length > 0,
      label: 'Agregar los datos de pago',
      to: '/admin/ajustes',
    },
    {
      done: (published ?? 0) > 0,
      label: 'Publicar el primer producto',
      to: '/admin/productos/nuevo',
    },
  ]
  const pending = checklist.filter((item) => !item.done)

  return (
    <>
      <header className="admin-head">
        <h1>Hola, {admin?.display_name}</h1>
      </header>

      <div className="stats">
        <Link to="/admin/productos" className="stat">
          <span className="stat__value">{published ?? '–'}</span>
          <span className="stat__label">Productos publicados</span>
        </Link>
        <Link to="/admin/productos" className="stat">
          <span className="stat__value">{drafts ?? '–'}</span>
          <span className="stat__label">Borradores</span>
        </Link>
      </div>

      {pending.length > 0 && (
        <section className="card">
          <h2>Para dejar la tienda lista</h2>
          <ul className="checklist">
            {checklist.map((item) => (
              <li key={item.label} className={item.done ? 'is-done' : ''}>
                <span aria-hidden="true">{item.done ? '✓' : '○'}</span>
                {item.done ? item.label : <Link to={item.to}>{item.label}</Link>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h2>Atajos</h2>
        <div className="shortcuts">
          <Link className="btn btn--dark" to="/admin/productos/nuevo">
            Crear producto
          </Link>
          <Link className="btn btn--ghost" to="/admin/ajustes">
            Editar ajustes de la tienda
          </Link>
          <a className="btn btn--ghost" href="/" target="_blank" rel="noopener noreferrer">
            Ver la tienda
          </a>
        </div>
      </section>
    </>
  )
}
