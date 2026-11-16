import { ORDER_STATUS_LABELS, type OrderStatus } from '../lib/adminTypes'

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`badge badge--${status}`}>{ORDER_STATUS_LABELS[status]}</span>
}

export function PaymentBadge({
  paid,
  withoutPayment,
}: {
  paid: boolean
  withoutPayment: boolean
}) {
  if (paid) return <span className="badge badge--ok">Pagado</span>
  if (withoutPayment) return <span className="badge badge--soft">Sin pago anticipado</span>
  return <span className="badge badge--warn">Falta pago</span>
}
