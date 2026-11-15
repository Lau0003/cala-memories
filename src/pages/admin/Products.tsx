import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { errorText, formatCOP } from '../../lib/format'
import { KIND_LABELS, type Product } from '../../lib/types'

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let active = true
    supabase
      .from('products')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
      .then(({ data, error: err }) => {
        if (!active) return
        if (err) setError(errorText(err))
        setProducts((data as Product[] | null) ?? [])
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return products
    return products.filter((p) => p.name.toLowerCase().includes(term))
  }, [products, search])

  async function togglePublished(product: Product) {
    const next = !product.published
    setProducts((list) => list.map((p) => (p.id === product.id ? { ...p, published: next } : p)))
    const { error: err } = await supabase
      .from('products')
      .update({ published: next })
      .eq('id', product.id)
    if (err) {
      setError(`No se pudo cambiar el estado: ${errorText(err)}`)
      setProducts((list) =>
        list.map((p) => (p.id === product.id ? { ...p, published: !next } : p)),
      )
    }
  }

  return (
    <>
      <header className="admin-head">
        <h1>Productos</h1>
        <Link className="btn btn--dark" to="/admin/productos/nuevo">
          Crear producto
        </Link>
      </header>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {!loading && products.length > 0 && (
        <input
          type="search"
          className="admin-search"
          placeholder="Buscar por nombre"
          aria-label="Buscar productos"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}

      {loading && <p className="muted">Cargando…</p>}

      {!loading && products.length === 0 && (
        <div className="card empty">
          <h2>Aún no hay productos</h2>
          <p className="muted">
            Crea el primero. Puedes guardarlo como borrador y publicarlo cuando esté listo.
          </p>
          <Link className="btn btn--dark" to="/admin/productos/nuevo">
            Crear producto
          </Link>
        </div>
      )}

      {!loading && products.length > 0 && visible.length === 0 && (
        <p className="muted">Ningún producto coincide con «{search}».</p>
      )}

      {visible.length > 0 && (
        <ul className="rows">
          {visible.map((product) => (
            <li key={product.id} className="row">
              <div className="row__thumb">
                {product.images[0] ? (
                  <img src={product.images[0]} alt="" loading="lazy" />
                ) : (
                  <div className="photo-placeholder" aria-hidden="true" />
                )}
              </div>
              <div className="row__main">
                <Link to={`/admin/productos/${product.id}`} className="row__title">
                  {product.name}
                </Link>
                <span className="row__meta">
                  {product.price > 0
                    ? `${product.price_is_from ? 'Desde ' : ''}${formatCOP(product.price)}`
                    : 'Se cotiza'}
                  {', '}
                  {KIND_LABELS[product.kind].toLowerCase()}
                  {product.is_combo ? ', combo' : ''}
                  {', '}
                  {product.production_steps.length} pasos
                </span>
              </div>
              <div className="row__actions">
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={product.published}
                    onChange={() => togglePublished(product)}
                  />
                  <span>{product.published ? 'Publicado' : 'Borrador'}</span>
                </label>
                <Link className="btn btn--ghost btn--small" to={`/admin/productos/${product.id}`}>
                  Editar
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
