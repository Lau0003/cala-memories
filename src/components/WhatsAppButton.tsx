import { FaWhatsapp } from 'react-icons/fa6'
import { useLocation } from 'react-router-dom'
import { useSettings } from '../lib/settings'
import { whatsappLink } from '../lib/format'

/** Botón flotante, siempre visible en la tienda. */
export default function WhatsAppButton() {
  const { settings } = useSettings()
  const location = useLocation()

  if (!settings.whatsapp_number) return null

  const onProduct = location.pathname.startsWith('/producto/')
  const message = onProduct
    ? `Hola CaLa, tengo una pregunta sobre este producto: ${window.location.href}`
    : 'Hola CaLa, tengo una pregunta.'

  return (
    <a
      className="wa-fab"
      href={whatsappLink(settings.whatsapp_number, message)}
      target="_blank"
      rel="noopener noreferrer"
    >
      <FaWhatsapp aria-hidden="true" />
      <span className="wa-fab__label">Escríbenos</span>
    </a>
  )
}
