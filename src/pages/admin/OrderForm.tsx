import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ReferencePhotos from '../../components/ReferencePhotos'
import StepsEditor from '../../components/StepsEditor'
import { useAdmins } from '../../lib/admins'
import type { Order } from '../../lib/adminTypes'
import { useAuth } from '../../lib/auth'
import { errorText } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import { KIND_LABELS, type Product, type ProductKind } from '../../lib/types'

interface Draft {
  product_id: string
  product_name: string
  kind: ProductKind
  variant: string
  quantity: string
  customer_name: string
  customer_phone: string
  customer_email: string
  address: string
  city: string
  notes: string
  reference_images: string[]
  total_price: string
  shipping_fee: string
  paid: boolean
  payment_method: string
  produce_without_payment: boolean
  assigned_to: string
  due_date: string
  steps: string[]
}

const EMPTY: Draft = {
  product_id: '',
  product_name: '',
  kind: 'personalizado',
  variant: '',
  quantity: '1',
  customer_name: '',
  customer_phone: '',
  customer_email: '',
  address: '',
  city: '',
  notes: '',
  reference_images: [],
  total_price: '',
  shipping_fee: '',
  paid: false,
  payment_method: '',
  produce_without_payment: false,
  assigned_to: '',
  due_date: '',
  steps: [],
}

function toInt(value: string): number {
  const n = parseInt(value, 10)
  return Number.isFinite(n) ? n : 0
}

export default function OrderForm() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const { userId } = useAuth()
  const admins = useAdmins()

  const [draft, setDraft] = useState<Draft>({ ...EMPTY, assigned_to: userId ?? '' })
  const [products, setProducts] = useState<Product[]>([])
  const [wasPaid, setWasPaid] = useState(false)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    supabase
      .from('products')
      .select('*')
      .order('name')
      .then(({ data }: { data: Product[] | null }) => {
        if (active) setProducts(data ?? [])
      })

    if (id) {
      supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .maybeSingle()
        .then(({ data }: { data: Order | null }) => {
          if (!active) return
          if (data) {
            setWasPaid(data.paid)
            setDraft({
              product_id: data.product_id ?? '',
              product_name: data.product_name,
              kind: data.kind,
              variant: data.variant,
              quantity: String(data.quantity),
              customer_name: data.customer_name,
              customer_phone: data.customer_phone,
              customer_email: data.customer_email,
              address: data.address,
              city: data.city,
              notes: data.notes,
              reference_images: data.reference_images,
              total_price: data.total_price ? String(data.total_price) : '',
              shipping_fee: data.shipping_fee ? String(data.shipping_fee) : '',
              paid: data.paid,
              payment_method: data.payment_method,
              produce_without_payment: data.produce_without_payment,
              assigned_to: data.assigned_to ?? '',
              due_date: data.due_date ?? '',
              steps: [],
            })
          }
          setLoading(false)
        })
    }
    return () => {
      active = false
    }
  }, [id])

  const product = products.find((p) => p.id === draft.product_id) ?? null
  // Lo que exige esta orden, según lo configurado en el producto
  const needsAddress = product?.requires_address ?? false
  const needsPhoto = product?.requires_reference_photo ?? false
  const needsEmail = product?.requires_email ?? false

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  function chooseProduct(productId: string) {
    const chosen = products.find((p) => p.id === productId)
    setDraft((d) => {
      if (!chosen) {
        return { ...d, product_id: '', product_name: '', kind: 'personalizado', variant: '' }
      }
      const quantity = Math.max(1, toInt(d.quantity))
      return {
        ...d,
        product_id: chosen.id,
        product_name: chosen.name,
        kind: chosen.kind,
        variant: chosen.variants[0] ?? '',
        total_price: chosen.price > 0 ? String(chosen.price * quantity) : d.total_price,
        steps: isNew ? chosen.production_steps : d.steps,
      }
    })
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const name = draft.customer_name.trim()
    const productName = draft.product_name.trim()
    if (!productName) return setError('Escribe qué se va a fabricar.')
    if (!name) return setError('Escribe el nombre del cliente.')
    if (!draft.customer_phone.trim()) return setError('Escribe el teléfono del cliente.')
    if (needsAddress && !draft.address.trim())
      return setError('Este producto exige la dirección completa.')
    if (needsEmail && !draft.customer_email.trim())
      return setError('Este producto exige el correo del cliente.')
    if (needsPhoto && draft.reference_images.length === 0)
      return setError('Este producto exige al menos una foto de referencia.')

    const payload = {
      product_id: draft.product_id || null,
      product_name: productName,
      kind: draft.kind,
      variant: draft.variant.trim(),
      quantity: Math.max(1, toInt(draft.quantity)),
      customer_name: name,
      customer_phone: draft.customer_phone.trim(),
      customer_email: draft.customer_email.trim(),
      address: draft.address.trim(),
      city: draft.city.trim(),
      notes: draft.notes.trim(),
      reference_images: draft.reference_images,
      total_price: toInt(draft.total_price),
      shipping_fee: toInt(draft.shipping_fee),
      paid: draft.paid,
      payment_method: draft.payment_method.trim(),
      produce_without_payment: draft.produce_without_payment,
      assigned_to: draft.assigned_to || null,
      due_date: draft.due_date || null,
    }

    setSaving(true)

    if (isNew) {
      const { data, error: err } = await supabase
        .from('orders')
        .insert({
          ...payload,
          paid_at: draft.paid ? new Date().toISOString() : null,
          created_by: userId,
        })
        .select('id')
        .single()
      if (err || !data) {
        setSaving(false)
        return setError(`No se pudo crear la orden: ${errorText(err)}`)
      }
      const orderId = (data as { id: string }).id
      if (draft.steps.length > 0) {
        await supabase
          .from('order_steps')
          .insert(draft.steps.map((step, i) => ({ order_id: orderId, position: i + 1, name: step })))
      }
      await supabase
        .from('order_events')
        .insert({ order_id: orderId, note: 'Orden creada', created_by: userId })
      navigate(`/admin/ordenes/${orderId}`)
      return
    }

    const paidChanged = draft.paid !== wasPaid
    const { error: err } = await supabase
      .from('orders')
      .update({
        ...payload,
        ...(paidChanged ? { paid_at: draft.paid ? new Date().toISOString() : null } : {}),
      })
      .eq('id', id!)
    setSaving(false)
    if (err) return setError(`No se pudo guardar: ${errorText(err)}`)
    navigate(`/admin/ordenes/${id}`)
  }

  if (loading) return <p className="muted">Cargando…</p>

  return (
    <form onSubmit={handleSubmit} className="form">
      <header className="admin-head">
        <div>
          <Link to={isNew ? '/admin/ordenes' : `/admin/ordenes/${id}`} className="back-link">
            {isNew ? 'Órdenes' : 'Volver a la orden'}
          </Link>
          <h1>{isNew ? 'Crear orden' : 'Editar orden'}</h1>
        </div>
      </header>

      <section className="card">
        <h2>Qué se va a fabricar</h2>
        <label className="field">
          <span>Producto</span>
          <select value={draft.product_id} onChange={(e) => chooseProduct(e.target.value)}>
            <option value="">Pedido 100 % personalizado (sin producto del catálogo)</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.published ? '' : ' (borrador)'}
              </option>
            ))}
          </select>
        </label>

        {!product && (
          <label className="field">
            <span>Descripción del pedido</span>
            <input
              type="text"
              placeholder="Ej. Figura de mascota con base grabada"
              value={draft.product_name}
              onChange={(e) => set('product_name', e.target.value)}
            />
          </label>
        )}

        <p className="muted">Tipo: {KIND_LABELS[draft.kind]}</p>

        <div className="field-row">
          {product && product.variants.length > 0 ? (
            <label className="field">
              <span>Opción</span>
              <select value={draft.variant} onChange={(e) => set('variant', e.target.value)}>
                {product.variants.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="field">
              <span>Opción o color</span>
              <input
                type="text"
                value={draft.variant}
                onChange={(e) => set('variant', e.target.value)}
              />
            </label>
          )}
          <label className="field">
            <span>Cantidad</span>
            <input
              type="number"
              min={1}
              value={draft.quantity}
              onChange={(e) => set('quantity', e.target.value)}
            />
          </label>
        </div>

        <label className="field">
          <span>Notas del pedido</span>
          <textarea
            rows={3}
            placeholder="Detalles de la personalización, colores, texto, etc."
            value={draft.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </label>
      </section>

      <section className="card">
        <h2>Cliente</h2>
        <div className="field-row">
          <label className="field">
            <span>Nombre</span>
            <input
              type="text"
              required
              value={draft.customer_name}
              onChange={(e) => set('customer_name', e.target.value)}
            />
          </label>
          <label className="field">
            <span>Teléfono</span>
            <input
              type="tel"
              required
              value={draft.customer_phone}
              onChange={(e) => set('customer_phone', e.target.value)}
            />
          </label>
        </div>
        <label className="field">
          <span>Correo{needsEmail ? '' : ' (opcional)'}</span>
          <input
            type="email"
            required={needsEmail}
            value={draft.customer_email}
            onChange={(e) => set('customer_email', e.target.value)}
          />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Dirección completa{needsAddress ? '' : ' (opcional)'}</span>
            <input
              type="text"
              required={needsAddress}
              placeholder="Calle, número, apto, barrio"
              value={draft.address}
              onChange={(e) => set('address', e.target.value)}
            />
          </label>
          <label className="field">
            <span>Ciudad o municipio</span>
            <input type="text" value={draft.city} onChange={(e) => set('city', e.target.value)} />
          </label>
        </div>
      </section>

      <section className="card">
        <h2>Fotos de referencia{needsPhoto ? '' : ' (opcional)'}</h2>
        <p className="muted">
          {needsPhoto
            ? 'Este producto exige al menos una foto. Solo ustedes pueden verlas.'
            : 'Solo ustedes pueden verlas.'}
        </p>
        <ReferencePhotos
          paths={draft.reference_images}
          onChange={(paths) => set('reference_images', paths)}
        />
      </section>

      <section className="card">
        <h2>Pago</h2>
        <div className="field-row">
          <label className="field">
            <span>Precio total (COP)</span>
            <input
              type="number"
              min={0}
              step={100}
              value={draft.total_price}
              onChange={(e) => set('total_price', e.target.value)}
            />
          </label>
          <label className="field">
            <span>Envío (COP)</span>
            <input
              type="number"
              min={0}
              step={100}
              value={draft.shipping_fee}
              onChange={(e) => set('shipping_fee', e.target.value)}
            />
          </label>
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={draft.paid}
            onChange={(e) => set('paid', e.target.checked)}
          />
          <span>Ya pagó (recibimos el comprobante)</span>
        </label>
        {draft.paid && (
          <label className="field field--short">
            <span>Medio de pago</span>
            <input
              type="text"
              placeholder="Ej. Nequi, Bancolombia"
              value={draft.payment_method}
              onChange={(e) => set('payment_method', e.target.value)}
            />
          </label>
        )}
        <label className="check">
          <input
            type="checkbox"
            checked={draft.produce_without_payment}
            onChange={(e) => set('produce_without_payment', e.target.checked)}
          />
          <span>
            Desarrollar sin pago anticipado
            <small>Para familiares o conocidos. Permite empezar aunque no haya pagado.</small>
          </span>
        </label>
      </section>

      <section className="card">
        <h2>Seguimiento</h2>
        <div className="field-row">
          <label className="field">
            <span>Responsable</span>
            <select value={draft.assigned_to} onChange={(e) => set('assigned_to', e.target.value)}>
              <option value="">Sin asignar</option>
              {admins.map((a) => (
                <option key={a.user_id} value={a.user_id}>
                  {a.display_name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Fecha de entrega</span>
            <input
              type="date"
              value={draft.due_date}
              onChange={(e) => set('due_date', e.target.value)}
            />
          </label>
        </div>
      </section>

      {isNew && (
        <section className="card">
          <h2>Pasos de producción</h2>
          <p className="muted">
            {product
              ? 'Vienen del producto. Puedes ajustarlos solo para esta orden.'
              : 'Arma los pasos para este pedido.'}
          </p>
          <StepsEditor steps={draft.steps} onChange={(steps) => set('steps', steps)} />
        </section>
      )}

      <div className="form-bar">
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-bar__actions">
          <button type="submit" className="btn btn--dark" disabled={saving}>
            {saving ? 'Guardando…' : isNew ? 'Crear orden' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </form>
  )
}
