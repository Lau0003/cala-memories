import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PaymentBadge, StatusBadge } from '../../components/OrderBadges'
import type { Order, Task } from '../../lib/adminTypes'
import { useAuth } from '../../lib/auth'
import { formatDate, isOverdue } from '../../lib/dates'
import { useSettings } from '../../lib/settings'
import { supabase } from '../../lib/supabase'

const CLOSED = ['entregada', 'cancelada']

export default function Dashboard() {
  const { admin, userId } = useAuth()
  const { settings } = useSettings()
  const [orders, setOrders] = useState<Order[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [published, setPublished] = useState<number | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      const [o, t, p] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('tasks').select('*').eq('done', false).order('due_date'),
        supabase.from('products').select('published'),
      ])
      if (!active) return
      setOrders(((o.data as Order[] | null) ?? []).filter((x) => !CLOSED.includes(x.status)))
      setTasks((t.data as Task[] | null) ?? [])
      setPublished(
        ((p.data as { published: boolean }[] | null) ?? []).filter((x) => x.published).length,
      )
      setLoaded(true)
    }
    load()
    return () => {
      active = false
    }
  }, [])

  const unpaid = orders.filter((o) => !o.paid)
  const myTasks = tasks.filter((t) => t.assigned_to === userId)

  const checklist = [
    {
      done: Boolean(settings.whatsapp_number),
      label: 'Agregar el número de WhatsApp (activa el botón flotante de la tienda)',
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
  const pending = loaded && checklist.some((item) => !item.done)

  return (
    <>
      <header className="admin-head">
        <h1>Hola, {admin?.display_name}</h1>
        <Link className="btn btn--dark" to="/admin/ordenes/nueva">
          Crear orden
        </Link>
      </header>

      <div className="stats">
        <Link to="/admin/ordenes" className="stat">
          <span className="stat__value">{loaded ? orders.length : '–'}</span>
          <span className="stat__label">Órdenes activas</span>
        </Link>
        <Link to="/admin/ordenes" className="stat">
          <span className="stat__value">{loaded ? unpaid.length : '–'}</span>
          <span className="stat__label">Órdenes sin pago</span>
        </Link>
        <Link to="/admin/tareas" className="stat">
          <span className="stat__value">{loaded ? myTasks.length : '–'}</span>
          <span className="stat__label">Mis tareas pendientes</span>
        </Link>
        <Link to="/admin/productos" className="stat">
          <span className="stat__value">{published ?? '–'}</span>
          <span className="stat__label">Productos publicados</span>
        </Link>
      </div>

      {pending && (
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
        <h2>Órdenes en curso</h2>
        {loaded && orders.length === 0 && <p className="muted">No hay órdenes activas.</p>}
        {orders.length > 0 && (
          <ul className="plain-list">
            {orders.slice(0, 6).map((order) => (
              <li key={order.id} className="split">
                <span>
                  <Link to={`/admin/ordenes/${order.id}`} className="row__title">
                    #{order.order_number} {order.customer_name}
                  </Link>
                  <small className="muted block">
                    {order.product_name}
                    {order.due_date ? `, entrega ${formatDate(order.due_date)}` : ''}
                  </small>
                </span>
                <span className="split__end">
                  <StatusBadge status={order.status} />
                  <PaymentBadge paid={order.paid} withoutPayment={order.produce_without_payment} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>Mis tareas</h2>
        {loaded && myTasks.length === 0 && <p className="muted">No tienes tareas pendientes.</p>}
        {myTasks.length > 0 && (
          <ul className="plain-list">
            {myTasks.slice(0, 6).map((task) => (
              <li key={task.id} className="split">
                <span>{task.title}</span>
                {task.due_date && (
                  <small className={isOverdue(task.due_date) ? 'text-warn' : 'muted'}>
                    {formatDate(task.due_date)}
                  </small>
                )}
              </li>
            ))}
          </ul>
        )}
        <Link className="inline-link" to="/admin/tareas">
          Ver todas las tareas
        </Link>
      </section>
    </>
  )
}
