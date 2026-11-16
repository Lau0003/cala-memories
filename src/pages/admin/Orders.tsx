import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PaymentBadge, StatusBadge } from '../../components/OrderBadges'
import { adminName, useAdmins } from '../../lib/admins'
import { ORDER_STATUSES, ORDER_STATUS_LABELS, type Order } from '../../lib/adminTypes'
import { formatDate, isOverdue } from '../../lib/dates'
import { errorText, formatCOP } from '../../lib/format'
import { supabase } from '../../lib/supabase'

const CLOSED = ['entregada', 'cancelada']

export default function Orders() {
  const admins = useAdmins()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('activas')

  useEffect(() => {
    let active = true
    supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error: err }: { data: Order[] | null; error: unknown }) => {
        if (!active) return
        if (err) setError(errorText(err))
        setOrders(data ?? [])
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const visible = useMemo(() => {
    if (filter === 'todas') return orders
    if (filter === 'activas') return orders.filter((o) => !CLOSED.includes(o.status))
    return orders.filter((o) => o.status === filter)
  }, [filter, orders])

  return (
    <>
      <header className="admin-head">
        <h1>Órdenes</h1>
        <Link className="btn btn--dark" to="/admin/ordenes/nueva">
          Crear orden
        </Link>
      </header>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <div className="chips filter-bar" role="group" aria-label="Filtrar órdenes">
        <button
          type="button"
          className="chip"
          aria-pressed={filter === 'activas'}
          onClick={() => setFilter('activas')}
        >
          Activas
        </button>
        {ORDER_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            className="chip"
            aria-pressed={filter === status}
            onClick={() => setFilter(status)}
          >
            {ORDER_STATUS_LABELS[status]}
          </button>
        ))}
        <button
          type="button"
          className="chip"
          aria-pressed={filter === 'todas'}
          onClick={() => setFilter('todas')}
        >
          Todas
        </button>
      </div>

      {loading && <p className="muted">Cargando…</p>}

      {!loading && orders.length === 0 && (
        <div className="card empty">
          <h2>Aún no hay órdenes</h2>
          <p className="muted">
            Cuando un cliente confirme por WhatsApp, crea aquí su orden para hacerle seguimiento.
          </p>
          <Link className="btn btn--dark" to="/admin/ordenes/nueva">
            Crear orden
          </Link>
        </div>
      )}

      {!loading && orders.length > 0 && visible.length === 0 && (
        <p className="muted">No hay órdenes con este filtro.</p>
      )}

      {visible.length > 0 && (
        <ul className="rows">
          {visible.map((order) => (
            <li key={order.id} className="row">
              <div className="row__main">
                <Link to={`/admin/ordenes/${order.id}`} className="row__title">
                  #{order.order_number} {order.customer_name}
                </Link>
                <span className="row__meta">
                  {order.quantity > 1 ? `${order.quantity} × ` : ''}
                  {order.product_name}
                  {order.variant ? ` (${order.variant})` : ''}, {formatCOP(order.total_price)}
                </span>
                <span className="row__meta">
                  {adminName(admins, order.assigned_to)}
                  {order.due_date && (
                    <>
                      {', entrega '}
                      <span
                        className={
                          isOverdue(order.due_date) && !CLOSED.includes(order.status)
                            ? 'text-warn'
                            : ''
                        }
                      >
                        {formatDate(order.due_date)}
                      </span>
                    </>
                  )}
                </span>
              </div>
              <div className="row__actions">
                <StatusBadge status={order.status} />
                <PaymentBadge paid={order.paid} withoutPayment={order.produce_without_payment} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
