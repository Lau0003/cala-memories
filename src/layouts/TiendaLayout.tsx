import { FaFacebookF, FaInstagram, FaTiktok, FaWhatsapp } from 'react-icons/fa6'
import { Link, Outlet, useLocation } from 'react-router-dom'
import Logo from '../components/Logo'
import WhatsAppButton from '../components/WhatsAppButton'
import { useSettings } from '../lib/settings'
import { productionText, whatsappLink } from '../lib/format'

export default function TiendaLayout() {
  const { settings } = useSettings()
  const hasWhatsApp = Boolean(settings.whatsapp_number)
  const location = useLocation()

  return (
    <div className="tienda">
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>

      <header className="site-header">
        <div className="container site-header__inner">
          <Link to="/" aria-label="CaLa memories, inicio">
            <Logo />
          </Link>
          <nav className="site-nav" aria-label="Principal">
            <a href="/#productos">Productos</a>
            <a href="/#como-pedir">Cómo pedir</a>
            <Link to="/politicas">Políticas</Link>
          </nav>
          {hasWhatsApp && (
            <a
              className="btn btn--dark btn--small site-header__cta"
              href={whatsappLink(settings.whatsapp_number, 'Hola CaLa, quiero hacer un pedido.')}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaWhatsapp aria-hidden="true" />
              Pedir
            </a>
          )}
        </div>
      </header>

      <main id="contenido">
        <div key={location.pathname} className="page-enter">
          <Outlet />
        </div>
      </main>

      <footer className="site-footer">
        <div className="container site-footer__inner">
          <div className="site-footer__brand">
            <Logo tone="claro" />
            <p>Impresión 3D por encargo.</p>
          </div>

          <div>
            <h2 className="site-footer__title">Pedidos</h2>
            <p>
              Producción en{' '}
              {productionText(settings.production_min_days, settings.production_max_days)}.
            </p>
            <p>{settings.shipping_note}</p>
            <p>
              <Link to="/politicas">Ver políticas</Link>
            </p>
          </div>

          <div>
            <h2 className="site-footer__title">Contacto</h2>
            <ul className="site-footer__social">
              {hasWhatsApp && (
                <li>
                  <a
                    href={whatsappLink(settings.whatsapp_number, 'Hola CaLa.')}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FaWhatsapp aria-hidden="true" /> WhatsApp
                  </a>
                </li>
              )}
              {settings.instagram_url && (
                <li>
                  <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer">
                    <FaInstagram aria-hidden="true" /> Instagram
                  </a>
                </li>
              )}
              {settings.tiktok_url && (
                <li>
                  <a href={settings.tiktok_url} target="_blank" rel="noopener noreferrer">
                    <FaTiktok aria-hidden="true" /> TikTok
                  </a>
                </li>
              )}
              {settings.facebook_url && (
                <li>
                  <a href={settings.facebook_url} target="_blank" rel="noopener noreferrer">
                    <FaFacebookF aria-hidden="true" /> Facebook
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>
        <div className="container site-footer__legal">
          <span>© {new Date().getFullYear()} CaLa memories</span>
          <Link to="/admin">Administración</Link>
        </div>
      </footer>

      <WhatsAppButton />
    </div>
  )
}
