const dateFmt = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
const dateTimeFmt = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
})

/** Las fechas sin hora (2026-11-20) se leen al mediodía para que no se corran un día. */
function parse(value: string): Date {
  return new Date(value.length === 10 ? `${value}T12:00:00` : value)
}

export function formatDate(value: string | null): string {
  if (!value) return 'Sin fecha'
  return dateFmt.format(parse(value))
}

export function formatDateTime(value: string | null): string {
  if (!value) return ''
  return dateTimeFmt.format(parse(value))
}

/** Fecha de hoy en formato AAAA-MM-DD, en la hora local. */
export function todayISO(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export function isOverdue(date: string | null): boolean {
  return Boolean(date) && date! < todayISO()
}

/** Convierte una fecha guardada al formato que usa <input type="datetime-local">. */
export function toLocalInput(value: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
