import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ChipsInput from '../../components/ChipsInput'
import ImageManager from '../../components/ImageManager'
import StepsEditor from '../../components/StepsEditor'
import { useAuth } from '../../lib/auth'
import { useSettings } from '../../lib/settings'
import { supabase } from '../../lib/supabase'
import { errorText, slugify } from '../../lib/format'
import { KIND_HELP, KIND_LABELS, type Category, type Product, type ProductKind } from '../../lib/types'

interface Draft {
  name: string
  short_description: string
  description: string
  price: string
  price_is_from: boolean
  kind: ProductKind
  is_combo: boolean
  includes: string[]
  variants: string[]
  images: string[]
  category_id: string
  published: boolean
  featured: boolean
  sort_order: string
  production_min_days: string
  production_max_days: string
  requires_address: boolean
  requires_reference_photo: boolean
  requires_email: boolean
  production_steps: string[]
  internal_notes: string
}

const EMPTY: Draft = {
  name: '',
  short_description: '',
  description: '',
  price: '',
  price_is_from: false,
  kind: 'estandar',
  is_combo: false,
  includes: [],
  variants: [],
  images: [],
  category_id: '',
  published: false,
  featured: false,
  sort_order: '0',
  production_min_days: '',
  production_max_days: '',
  requires_address: true,
  requires_reference_photo: false,
  requires_email: false,
  production_steps: [],
  internal_notes: '',
}

function toDraft(p: Product): Draft {
  return {
    name: p.name,
    short_description: p.short_description,
    description: p.description,
    price: p.price ? String(p.price) : '',
    price_is_from: p.price_is_from,
    kind: p.kind,
    is_combo: p.is_combo,
    includes: p.includes,
    variants: p.variants,
    images: p.images,
    category_id: p.category_id ?? '',
    published: p.published,
    featured: p.featured,
    sort_order: String(p.sort_order),
    production_min_days: p.production_min_days?.toString() ?? '',
    production_max_days: p.production_max_days?.toString() ?? '',
    requires_address: p.requires_address,
    requires_reference_photo: p.requires_reference_photo,
    requires_email: p.requires_email,
    production_steps: p.production_steps,
    internal_notes: p.internal_notes,
  }
}

function toInt(value: string): number | null {
  const n = parseInt(value, 10)
  return Number.isFinite(n) ? n : null
}

export default function ProductForm() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const { userId } = useAuth()
  const { settings } = useSettings()

  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [slug, setSlug] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(!isNew)
  const [missing, setMissing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let active = true
    supabase
      .from('categories')
      .select('id, name, slug, sort_order')
      .order('sort_order')
      .then(({ data }) => {
        if (active) setCategories((data as Category[] | null) ?? [])
      })

    if (id) {
      supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .maybeSingle()
        .then(({ data }) => {
          if (!active) return
          if (data) {
            const product = data as Product
            setDraft(toDraft(product))
            setSlug(product.slug)
          } else {
            setMissing(true)
          }
          setLoading(false)
        })
    } else {
      setDraft(EMPTY)
      setSlug('')
    }
    return () => {
      active = false
    }
  }, [id])

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
    setSaved(false)
  }

  /** Al elegir el tipo, se ajustan los datos que normalmente se piden. */
  function setKind(kind: ProductKind) {
    setDraft((d) => ({
      ...d,
      kind,
      requires_reference_photo: kind === 'estandar' ? d.requires_reference_photo : true,
      price_is_from: kind === 'personalizado' ? true : d.price_is_from,
    }))
    setSaved(false)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const name = draft.name.trim()
    if (!name) {
      setError('Escribe el nombre del producto.')
      return
    }
    const min = toInt(draft.production_min_days)
    const max = toInt(draft.production_max_days)
    if (min !== null && max !== null && min > max) {
      setError('En el tiempo de producción, el mínimo no puede ser mayor que el máximo.')
      return
    }

    const payload = {
      name,
      short_description: draft.short_description.trim(),
      description: draft.description.trim(),
      price: toInt(draft.price) ?? 0,
      price_is_from: draft.price_is_from,
      kind: draft.kind,
      is_combo: draft.is_combo,
      includes: draft.is_combo ? draft.includes : [],
      variants: draft.variants,
      images: draft.images,
      category_id: draft.category_id || null,
      published: draft.published,
      featured: draft.featured,
      sort_order: toInt(draft.sort_order) ?? 0,
      production_min_days: min,
      production_max_days: max,
      requires_address: draft.requires_address,
      requires_reference_photo: draft.requires_reference_photo,
      requires_email: draft.requires_email,
      production_steps: draft.production_steps,
      internal_notes: draft.internal_notes.trim(),
    }

    setSaving(true)

    if (isNew) {
      const base = slugify(name) || 'producto'
      let result = await supabase
        .from('products')
        .insert({ ...payload, slug: base, created_by: userId })
        .select('id')
        .single()
      // 23505 = ya existe un producto con ese enlace: se le agrega un sufijo
      if (result.error?.code === '23505') {
        const suffix = Math.random().toString(36).slice(2, 6)
        result = await supabase
          .from('products')
          .insert({ ...payload, slug: `${base}-${suffix}`, created_by: userId })
          .select('id')
          .single()
      }
      setSaving(false)
      if (result.error) {
        setError(`No se pudo guardar: ${errorText(result.error)}`)
        return
      }
      navigate('/admin/productos')
      return
    }

    const { error: err } = await supabase.from('products').update(payload).eq('id', id!)
    setSaving(false)
    if (err) {
      setError(`No se pudo guardar: ${errorText(err)}`)
      return
    }
    setSaved(true)
  }

  async function handleDelete() {
    if (!id) return
    if (!window.confirm(`¿Eliminar «${draft.name}»? Esta acción no se puede deshacer.`)) return
    const { error: err } = await supabase.from('products').delete().eq('id', id)
    if (err) {
      setError(`No se pudo eliminar: ${errorText(err)}`)
      return
    }
    navigate('/admin/productos')
  }

  if (loading) return <p className="muted">Cargando…</p>

  if (missing) {
    return (
      <div className="card empty">
        <h1>Este producto no existe</h1>
        <Link className="btn btn--dark" to="/admin/productos">
          Volver a productos
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="form">
      <header className="admin-head">
        <div>
          <Link to="/admin/productos" className="back-link">
            Productos
          </Link>
          <h1>{isNew ? 'Crear producto' : draft.name || 'Editar producto'}</h1>
        </div>
        {!isNew && draft.published && (
          <a
            className="btn btn--ghost btn--small"
            href={`/producto/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Ver en la tienda
          </a>
        )}
      </header>

      <section className="card">
        <h2>Información</h2>
        <label className="field">
          <span>Nombre</span>
          <input
            type="text"
            required
            value={draft.name}
            onChange={(e) => set('name', e.target.value)}
          />
        </label>
        <label className="field">
          <span>Descripción corta</span>
          <input
            type="text"
            maxLength={140}
            placeholder="Una línea que aparece junto al precio"
            value={draft.short_description}
            onChange={(e) => set('short_description', e.target.value)}
          />
        </label>
        <label className="field">
          <span>Detalles</span>
          <textarea
            rows={5}
            placeholder="Medidas, materiales, qué incluye, cuidados…"
            value={draft.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Categoría</span>
            <select value={draft.category_id} onChange={(e) => set('category_id', e.target.value)}>
              <option value="">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Precio (COP)</span>
            <input
              type="number"
              min={0}
              step={100}
              inputMode="numeric"
              placeholder="Vacío = se cotiza"
              value={draft.price}
              onChange={(e) => set('price', e.target.value)}
            />
          </label>
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={draft.price_is_from}
            onChange={(e) => set('price_is_from', e.target.checked)}
          />
          <span>
            Mostrar como «Desde $…»
            <small>El cliente cotiza por WhatsApp en lugar de pagar directo.</small>
          </span>
        </label>
      </section>

      <section className="card">
        <h2>Fotos</h2>
        <ImageManager images={draft.images} onChange={(images) => set('images', images)} />
      </section>

      <section className="card">
        <h2>Tipo de producto</h2>
        <div className="radio-cards">
          {(Object.keys(KIND_LABELS) as ProductKind[]).map((kind) => (
            <label key={kind} className="radio-card">
              <input
                type="radio"
                name="kind"
                checked={draft.kind === kind}
                onChange={() => setKind(kind)}
              />
              <span>
                <strong>{KIND_LABELS[kind]}</strong>
                <small>{KIND_HELP[kind]}</small>
              </span>
            </label>
          ))}
        </div>

        <h3>Opciones para el cliente</h3>
        <p className="muted">Colores o versiones entre las que puede elegir.</p>
        <ChipsInput
          values={draft.variants}
          onChange={(variants) => set('variants', variants)}
          placeholder="Ej. Mármol"
        />

        <label className="check">
          <input
            type="checkbox"
            checked={draft.is_combo}
            onChange={(e) => set('is_combo', e.target.checked)}
          />
          <span>Es un combo</span>
        </label>
        {draft.is_combo && (
          <>
            <p className="muted">Qué incluye el combo.</p>
            <ChipsInput
              values={draft.includes}
              onChange={(includes) => set('includes', includes)}
              placeholder="Ej. 2 llaveros clicker"
            />
          </>
        )}
      </section>

      <section className="card">
        <h2>Datos que pide la orden</h2>
        <p className="muted">
          Lo que tendrán que llenar ustedes al crear una orden de este producto. Nombre y teléfono
          del cliente se piden siempre.
        </p>
        <label className="check">
          <input
            type="checkbox"
            checked={draft.requires_address}
            onChange={(e) => set('requires_address', e.target.checked)}
          />
          <span>Dirección completa</span>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={draft.requires_reference_photo}
            onChange={(e) => set('requires_reference_photo', e.target.checked)}
          />
          <span>
            Foto de referencia
            <small>También se le avisa al cliente en la tienda.</small>
          </span>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={draft.requires_email}
            onChange={(e) => set('requires_email', e.target.checked)}
          />
          <span>Correo del cliente</span>
        </label>
      </section>

      <section className="card">
        <h2>Pasos de producción</h2>
        <p className="muted">
          Cada orden de este producto empezará con esta lista, para marcar en qué paso va.
        </p>
        <StepsEditor
          steps={draft.production_steps}
          onChange={(steps) => set('production_steps', steps)}
        />
      </section>

      <section className="card">
        <h2>Tiempo de producción</h2>
        <p className="muted">
          Déjalo vacío para usar el general ({settings.production_min_days} a{' '}
          {settings.production_max_days} días hábiles).
        </p>
        <div className="field-row">
          <label className="field">
            <span>Mínimo (días hábiles)</span>
            <input
              type="number"
              min={0}
              value={draft.production_min_days}
              onChange={(e) => set('production_min_days', e.target.value)}
            />
          </label>
          <label className="field">
            <span>Máximo (días hábiles)</span>
            <input
              type="number"
              min={0}
              value={draft.production_max_days}
              onChange={(e) => set('production_max_days', e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="card">
        <h2>Publicación</h2>
        <label className="check">
          <input
            type="checkbox"
            checked={draft.published}
            onChange={(e) => set('published', e.target.checked)}
          />
          <span>
            Publicado en la tienda
            <small>Si lo desmarcas queda como borrador, solo visible en el panel.</small>
          </span>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={draft.featured}
            onChange={(e) => set('featured', e.target.checked)}
          />
          <span>Destacado (aparece primero)</span>
        </label>
        <label className="field field--short">
          <span>Orden en la tienda</span>
          <input
            type="number"
            value={draft.sort_order}
            onChange={(e) => set('sort_order', e.target.value)}
          />
          <small>Los números más bajos aparecen primero.</small>
        </label>
        <label className="field">
          <span>Notas internas</span>
          <textarea
            rows={3}
            placeholder="Solo las ven ustedes: archivos, ajustes de impresión, proveedores…"
            value={draft.internal_notes}
            onChange={(e) => set('internal_notes', e.target.value)}
          />
        </label>
      </section>

      <div className="form-bar">
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {saved && (
          <p className="form-ok" role="status">
            Cambios guardados.
          </p>
        )}
        <div className="form-bar__actions">
          {!isNew && (
            <button type="button" className="btn btn--danger" onClick={handleDelete}>
              Eliminar
            </button>
          )}
          <button type="submit" className="btn btn--dark" disabled={saving}>
            {saving ? 'Guardando…' : isNew ? 'Crear producto' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </form>
  )
}
