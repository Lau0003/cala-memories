import { useEffect, useMemo, useState } from 'react'
import PrintedCube from '../../components/PrintedCube'
import ProductCard from '../../components/ProductCard'
import { supabase } from '../../lib/supabase'
import { useSettings } from '../../lib/settings'
import { productionText } from '../../lib/format'
import { PUBLIC_PRODUCT_COLUMNS, type Category, type PublicProduct } from '../../lib/types'

export default function Home() {
  const { settings } = useSettings()
  const [products, setProducts] = useState<PublicProduct[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [filter, setFilter] = useState<string>('todos')

  useEffect(() => {
    let active = true
    async function load() {
      const [prod, cats] = await Promise.all([
        supabase
          .from('products')
          .select(PUBLIC_PRODUCT_COLUMNS)
          .eq('published', true)
          .order('featured', { ascending: false })
          .order('sort_order', { ascending: true })
          .order('name', { ascending: true }),
        supabase.from('categories').select('id, name, slug, sort_order').order('sort_order'),
      ])
      if (!active) return
      if (prod.error) setFailed(true)
      setProducts((prod.data as unknown as PublicProduct[]) ?? [])
      setCategories((cats.data as Category[]) ?? [])
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [])

  // Al llegar con un enlace tipo /#productos, baja hasta esa sección
  useEffect(() => {
    if (loading || !window.location.hash) return
    document.querySelector(window.location.hash)?.scrollIntoView()
  }, [loading])

  // Solo se muestran como filtro las categorías que tienen productos publicados
  const usedCategories = useMemo(
    () => categories.filter((c) => products.some((p) => p.category_id === c.id)),
    [categories, products],
  )

  const visible = useMemo(() => {
    if (filter === 'todos') return products
    if (filter === 'combos') return products.filter((p) => p.is_combo)
    return products.filter((p) => p.category_id === filter)
  }, [filter, products])

  const hasCombos = products.some((p) => p.is_combo)
  const production = productionText(settings.production_min_days, settings.production_max_days)

  return (
    <>
      <section className="hero">
        <div className="container hero__inner">
          <div className="hero__copy">
            <h1>{settings.hero_title}</h1>
            <p>{settings.hero_subtitle}</p>
            <div className="hero__actions">
              <a className="btn btn--dark" href="#productos">
                Ver productos
              </a>
              <a className="btn btn--ghost" href="#como-pedir">
                Cómo pedir
              </a>
            </div>
          </div>
          <div className="hero__art">
            <PrintedCube />
          </div>
        </div>
      </section>

      <section className="facts" aria-label="Información de pedidos">
        <dl className="container facts__list">
          <div>
            <dt>Producción</dt>
            <dd>{production}, según el pedido</dd>
          </div>
          <div>
            <dt>Pago</dt>
            <dd>Por transferencia. Empezamos al recibir el comprobante</dd>
          </div>
          <div>
            <dt>Entrega</dt>
            <dd>{settings.shipping_note}</dd>
          </div>
        </dl>
      </section>

      <section className="catalog container" id="productos">
        <div className="catalog__head">
          <h2>Productos</h2>
          {(usedCategories.length > 1 || hasCombos) && (
            <div className="chips" role="group" aria-label="Filtrar productos">
              <button
                type="button"
                className="chip"
                aria-pressed={filter === 'todos'}
                onClick={() => setFilter('todos')}
              >
                Todos
              </button>
              {usedCategories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="chip"
                  aria-pressed={filter === c.id}
                  onClick={() => setFilter(c.id)}
                >
                  {c.name}
                </button>
              ))}
              {hasCombos && (
                <button
                  type="button"
                  className="chip"
                  aria-pressed={filter === 'combos'}
                  onClick={() => setFilter('combos')}
                >
                  Combos
                </button>
              )}
            </div>
          )}
        </div>

        {loading && <p className="muted">Cargando productos…</p>}

        {!loading && failed && (
          <p className="notice">
            No pudimos cargar los productos. Revisa tu conexión y vuelve a intentar.
          </p>
        )}

        {!loading && !failed && products.length === 0 && (
          <p className="notice">
            Estamos montando el catálogo. Mientras tanto, escríbenos por WhatsApp y te contamos
            qué podemos hacer para ti.
          </p>
        )}

        {!loading && visible.length > 0 && (
          <div className="product-grid">
            {visible.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      <section className="how" id="como-pedir">
        <div className="container">
          <h2>Cómo pedir</h2>
          <ol className="how__steps">
            <li>
              <h3>Elige</h3>
              <p>Abre el producto que te gusta y revisa precio, opciones y tiempo de producción.</p>
            </li>
            <li>
              <h3>Transfiere</h3>
              <p>En el producto, toca «Comprar» y verás los datos para hacer la transferencia.</p>
            </li>
            <li>
              <h3>Envía el comprobante</h3>
              <p>
                Mándalo por WhatsApp. Si tu pedido es personalizado, adjunta también las fotos de
                referencia.
              </p>
            </li>
            <li>
              <h3>Recibe</h3>
              <p>Lo fabricamos en {production} y coordinamos la entrega contigo.</p>
            </li>
          </ol>
        </div>
      </section>
    </>
  )
}
