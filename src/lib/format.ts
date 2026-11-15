const cop = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

export function formatCOP(value: number): string {
  return cop.format(Number(value) || 0)
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70)
}

export function productionText(min: number, max: number): string {
  if (min === max) return `${min} ${min === 1 ? 'día hábil' : 'días hábiles'}`
  return `${min} a ${max} días hábiles`
}

/** Arma el enlace para abrir un chat de WhatsApp con un mensaje ya escrito. */
export function whatsappLink(number: string, message: string): string {
  const digits = number.replace(/\D/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

/** Mensaje de error legible a partir de un error de Supabase. */
export function errorText(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return 'Ocurrió un error inesperado.'
}
