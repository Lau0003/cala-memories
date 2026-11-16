import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { FaWhatsapp } from 'react-icons/fa6'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PaymentBadge } from '../../components/OrderBadges'
import ReferencePhotos from '../../components/ReferencePhotos'
import { adminName, useAdmins } from '../../lib/admins'
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  type Order,
  type OrderEvent,
  type OrderStatus,
  type OrderStep,
  type Supply,
  type SupplyMovement,
} from '../../lib/adminTypes'
import { useAuth } from '../../lib/auth'
import { formatDate, formatDateTime } from '../../lib/dates'
import { errorText, formatCOP, whatsappLink } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import { KIND_LABELS } from '../../lib/types'

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { userId } = useAuth()
  const admins = useAdmins()

  const [order, setOrder] = useState<Order | null>(null)
  const [steps, setSteps] = useState<OrderStep[]>([])
  const [events, setEvents] = useState<OrderEvent[]>([])
  const [supplies, setSupplies] = useState<Supply[]>([])
  const [movements, setMovements] = useState<SupplyMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [note, setNote] = useState('')
  const [newStep, setNewStep] = useState('')
  const [useSupply, setUseSupply] = useState('')
  const [useQty, setUseQty] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    const [o, s, e, sup, mov] = await Promise.all([
      supabase.from('orders').select('*').eq('id', id).maybeSingle(),
      supabase.from('order_steps').select('*').eq('order_id', id).order('position'),
      supabase
        .from('order_events')
        .select('*')
        .eq('order_id', id)
        .order('created_at', { ascending: false }),
      supabase.from('supplies').select('*').eq('active', true).order('name'),
      supabase.from('supply_movements').select('*').eq('order_id', id).order('created_at'),
    ])
    setOrder((o.data as Order | null) ?? null)
    setSteps((s.data as OrderStep[] | null) ?? [])
    setEvents((e.data as OrderEvent[] | null) ?? [])
    setSupplies((sup.data as Supply[] | null) ?? [])
    setMovements((mov.data as SupplyMovement[] | null) ?? [])
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function logEvent(text: string) {
    await supabase.from('order_events').insert({ order_id: id, note: text, created_by: userId })
  }

  /** Ejecuta un cambio, muestra el error si falla y recarga la orden. */
  async function run(action: () => PromiseLike<{ error: unknown }>, eventText?: string) {
    setError(null)
    const { error: err } = await action()
    if (err) {
      setError(errorText(err))
    } else if (eventText) {
      await logEvent(eventText)
    }
    await load()
  }

  if (loading) return <p className="muted">Cargando…</p>

  if (!order) {
    return (
      <div className="card empty">
        <h1>Esta orden no existe</h1>
        <Link className="btn btn--dark" to="/admin/ordenes">
          Volver a órdenes
        </Link>
      </div>
    )
  }

  const canStart = order.paid || order.produce_without_payment
  const doneCount = steps.filter((s) => s.done).length
  const currentStep = steps.find((s) => !s.done) ?? null
  const phoneDigits = order.customer_phone.replace(/\D/g, '')
  const waNumber = phoneDigits.length === 10 ? `57${phoneDigits}` : phoneDigits

  function changeStatus(status: OrderStatus) {
    if (!order || status === order.status) return
    run(
      () =>
        supabase
          .from('orders')
          .update({
            status,
            delivered_at: status === 'entregada' ? new Date().toISOString() : order.delivered_at,
          })
          .eq('id', order.id),
      `Estado: ${ORDER_STATUS_LABELS[status]}`,
    )
  }

  function togglePaid() {
    if (!order) return
    const paid = !order.paid
    run(
      () =>
        supabase
          .from('orders')
          .update({ paid, paid_at: paid ? new Date().toISOString() : null })
          .eq('id', order.id),
      paid ? 'Pago registrado' : 'Pago desmarcado',
    )
  }

  function toggleStep(step: OrderStep) {
    const done = !step.done
    run(
      () =>
        supabase
          .from('order_steps')
          .update({
            done,
            done_at: done ? new Date().toISOString() : null,
            done_by: done ? userId : null,
          })
          .eq('id', step.id),
      done ? `Paso terminado: ${step.name}` : `Paso reabierto: ${step.name}`,
    )
  }

  function addStep(event: FormEvent) {
    event.preventDefault()
    const name = newStep.trim()
    if (!name) return
    const position = steps.reduce((max, s) => Math.max(max, s.position), 0) + 1
    setNewStep('')
    run(() => supabase.from('order_steps').insert({ order_id: id, position, name }))
  }

  function removeStep(step: OrderStep) {
    if (!window.confirm(`¿Quitar el paso «${step.name}» de esta orden?`)) return
    run(() => supabase.from('order_steps').delete().eq('id', step.id))
  }

  function addNote(event: FormEvent) {
    event.preventDefault()
    const text = note.trim()
    if (!text) return
    setNote('')
    run(() =>
      supabase.from('order_events').insert({ order_id: id, note: text, created_by: userId }),
    )
  }

  async function addMaterial(event: FormEvent) {
    event.preventDefault()
    if (!order) return
    const supply = supplies.find((s) => s.id === useSupply)
    const qty = Number(useQty)
    if (!supply || !(qty > 0)) {
      setError('Elige un insumo y escribe la cantidad usada.')
      return
    }
    if (qty > Number(supply.stock_qty)) {
      setError(`Solo hay ${Number(supply.stock_qty)} ${supply.unit} de ${supply.name} en inventario.`)
      return
    }
    setUseQty('')
    await run(async () => {
      const first = await supabase.from('supply_movements').insert({
        supply_id: supply.id,
        order_id: order.id,
        qty: -qty,
        reason: `Orden #${order.order_number}`,
        created_by: userId,
      })
      if (first.error) return first
      return supabase
        .from('supplies')
        .update({ stock_qty: Number(supply.stock_qty) - qty })
        .eq('id', supply.id)
    })
  }

  async function undoMaterial(movement: SupplyMovement) {
    const supply = supplies.find((s) => s.id === movement.supply_id)
    await run(async () => {
      const first = await supabase.from('supply_movements').delete().eq('id', movement.id)
      if (first.error || !supply) return first
      return supabase
        .from('supplies')
        .update({ stock_qty: Number(supply.stock_qty) - Number(movement.qty) })
        .eq('id', supply.id)
    })
  }

  async function removeOrder() {
    if (!order) return
    if (!window.confirm(`¿Eliminar la orden #${order.order_number}? No se puede deshacer.`)) return
    const { error: err } = await supabase.from('orders').delete().eq('id', order.id)
    if (err) {
      setError(`No se pudo eliminar: ${errorText(err)}`)
      return
    }
    navigate('/admin/ordenes')
  }

  return (
    <>
      <header className="admin-head">
        <div>
          <Link to="/admin/ordenes" className="back-link">
            Órdenes
          </Link>
          <h1>
            Orden #{order.order_number}
          </h1>
        </div>
        <div className="shortcuts">
          <Link className="btn btn--ghost btn--small" to={`/admin/ordenes/${order.id}/editar`}>
            Editar datos
          </Link>
          <button type="button" className="btn btn--danger btn--small" onClick={removeOrder}>
            Eliminar
          </button>
        </div>
      </header>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <section className="card">
        <h2>Estado</h2>
        <div className="chips" role="group" aria-label="Estado de la orden">
          {ORDER_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              className="chip"
              aria-pressed={order.status === status}
              onClick={() => changeStatus(status)}
            >
              {ORDER_STATUS_LABELS[status]}
            </button>
          ))}
        </div>

        <div className="pay-line">
          <PaymentBadge paid={order.paid} withoutPayment={order.produce_without_payment} />
          <span className="muted">
            {formatCOP(order.total_price)}
            {order.shipping_fee > 0 ? ` + ${formatCOP(order.shipping_fee)} de envío` : ''}
            {order.paid && order.paid_at ? `, pagado el ${formatDate(order.paid_at)}` : ''}
            {order.paid && order.payment_method ? ` por ${order.payment_method}` : ''}
          </span>
          <button type="button" className="btn btn--ghost btn--small" onClick={togglePaid}>
            {order.paid ? 'Desmarcar pago' : 'Registrar pago'}
          </button>
        </div>

        {!canStart && (
          <p className="callout callout--warn">
            Falta el pago. No empieces la producción hasta recibir el comprobante, o marca
            «Desarrollar sin pago anticipado» en «Editar datos».
          </p>
        )}
      </section>

      <section className="card">
        <h2>Producción</h2>
        {steps.length > 0 ? (
          <>
            <p className="muted">
              {doneCount} de {steps.length} pasos terminados.
              {currentStep ? ` Va en: ${currentStep.name}.` : ' Todos los pasos están listos.'}
            </p>
            <div className="progress" aria-hidden="true">
              <span style={{ width: `${(doneCount / steps.length) * 100}%` }} />
            </div>
            <ul className="steps-check">
              {steps.map((step) => (
                <li
                  key={step.id}
                  className={step.done ? 'is-done' : step.id === currentStep?.id ? 'is-current' : ''}
                >
                  <label>
                    <input type="checkbox" checked={step.done} onChange={() => toggleStep(step)} />
                    <span>
                      {step.name}
                      {step.done && step.done_at && (
                        <small>
                          {formatDateTime(step.done_at)}, {adminName(admins, step.done_by)}
                        </small>
                      )}
                    </span>
                  </label>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Quitar ${step.name}`}
                    onClick={() => removeStep(step)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="muted">Esta orden no tiene pasos. Agrega el primero.</p>
        )}
        <form className="chips-input__row" onSubmit={addStep}>
          <input
            type="text"
            placeholder="Agregar un paso a esta orden"
            aria-label="Nuevo paso"
            value={newStep}
            onChange={(e) => setNewStep(e.target.value)}
          />
          <button type="submit" className="btn btn--ghost btn--small">
            Agregar paso
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Pedido y cliente</h2>
        <dl className="dl">
          <div>
            <dt>Producto</dt>
            <dd>
              {order.quantity > 1 ? `${order.quantity} × ` : ''}
              {order.product_name}
              {order.variant ? ` (${order.variant})` : ''}
            </dd>
          </div>
          <div>
            <dt>Tipo</dt>
            <dd>{KIND_LABELS[order.kind]}</dd>
          </div>
          {order.notes && (
            <div>
              <dt>Notas</dt>
              <dd className="pre">{order.notes}</dd>
            </div>
          )}
          <div>
            <dt>Cliente</dt>
            <dd>{order.customer_name}</dd>
          </div>
          <div>
            <dt>Teléfono</dt>
            <dd>
              {order.customer_phone}{' '}
              {waNumber && (
                <a
                  className="inline-link"
                  href={whatsappLink(waNumber, `Hola ${order.customer_name}, te escribimos de CaLa memories.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FaWhatsapp aria-hidden="true" /> Escribirle
                </a>
              )}
            </dd>
          </div>
          {order.customer_email && (
            <div>
              <dt>Correo</dt>
              <dd>{order.customer_email}</dd>
            </div>
          )}
          {(order.address || order.city) && (
            <div>
              <dt>Dirección</dt>
              <dd>{[order.address, order.city].filter(Boolean).join(', ')}</dd>
            </div>
          )}
          <div>
            <dt>Responsable</dt>
            <dd>{adminName(admins, order.assigned_to)}</dd>
          </div>
          <div>
            <dt>Entrega</dt>
            <dd>{formatDate(order.due_date)}</dd>
          </div>
        </dl>
      </section>

      <section className="card">
        <h2>Fotos de referencia</h2>
        <ReferencePhotos paths={order.reference_images} />
      </section>

      <section className="card">
        <h2>Material usado</h2>
        <p className="muted">Lo que registres aquí se descuenta del inventario.</p>
        {movements.length > 0 && (
          <ul className="plain-list">
            {movements.map((m) => {
              const supply = supplies.find((s) => s.id === m.supply_id)
              return (
                <li key={m.id} className="split">
                  <span>
                    {Math.abs(Number(m.qty))} {supply?.unit ?? ''} de {supply?.name ?? 'insumo'}
                  </span>
                  <button
                    type="button"
                    className="btn btn--ghost btn--small"
                    onClick={() => undoMaterial(m)}
                  >
                    Deshacer
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        {supplies.length === 0 ? (
          <p className="muted">
            Aún no hay insumos. Regístralos en <Link to="/admin/inventario">Inventario</Link>.
          </p>
        ) : (
          <form className="inline-form" onSubmit={addMaterial}>
            <label className="field">
              <span>Insumo</span>
              <select value={useSupply} onChange={(e) => setUseSupply(e.target.value)}>
                <option value="">Elegir…</option>
                {supplies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.color ? ` ${s.color}` : ''} ({Number(s.stock_qty)} {s.unit})
                  </option>
                ))}
              </select>
            </label>
            <label className="field field--tiny">
              <span>Cantidad</span>
              <input
                type="number"
                min={0}
                step="any"
                value={useQty}
                onChange={(e) => setUseQty(e.target.value)}
              />
            </label>
            <button type="submit" className="btn btn--dark">
              Descontar
            </button>
          </form>
        )}
      </section>

      <section className="card">
        <h2>Historial</h2>
        <form className="chips-input__row" onSubmit={addNote}>
          <input
            type="text"
            placeholder="Escribe un avance o novedad"
            aria-label="Nueva nota"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button type="submit" className="btn btn--ghost btn--small">
            Agregar nota
          </button>
        </form>
        <ul className="timeline">
          {events.map((event) => (
            <li key={event.id}>
              <span>{event.note}</span>
              <small>
                {formatDateTime(event.created_at)}, {adminName(admins, event.created_by)}
              </small>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
