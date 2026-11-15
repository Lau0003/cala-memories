import { useEffect, useState } from 'react'
import { FaWhatsapp } from 'react-icons/fa6'
import { Link, useParams } from 'react-router-dom'
import { priceLabel, productTag } from '../../components/ProductCard'
import { supabase } from '../../lib/supabase'
import { useSettings } from '../../lib/settings'
import { formatCOP, productionText, whatsappLink } from '../../lib/format'
import { PUBLIC_PRODUCT_COLUMNS, type PublicProduct } from '../../lib/types'

export default function ProductPage() {
  const { slug } = useParams()
  const { settings } = useSettings()
  const [product, setProduct] = useState<PublicProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [photo, setPhoto] = useState(0)
  const [variant, setVariant] = useState('')
  const [showPayment, setShowPayment] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setShowPayment(false)
    setPhoto(0)
    supabase
      .from('products')
      .select(PUBLIC_PRODUCT_COLUMNS)
      .eq('slug', slug ?? '')
      .eq('published', true)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return
        const found = (data as unknown as PublicProduct | null) ?? null
        setProduct(found)
        setVariant(found?.variants[0] ?? '')
        setLoading(false)
        if (found) document.title = `${found.name} | CaLa memories`
      })
    return () => {
      active = false
      document.title = 'CaLa memories | Impresión 3D'
    }
  }, [slug])

  if (loading) {
    return (
      <div className="container page-pad">
        <p className="muted">Cargando…</p>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="container page-pad">
        <h1>Este producto ya no está disponible</h1>
        <p className="muted">Puede que lo hayamos retirado o que el enlace esté incompleto.</p>
        <Link className="btn btn--dark" to="/">
          Ver todos los productos
        </Link>
      </div>
    )
  }

  const tag = productTag(product)
  const production = productionText(
    product.production_min_days ?? settings.production_min_days,
    product.production_max_days ?? settings.production_max_days,
  )
  const hasWhatsApp = Boolean(settings.whatsapp_number)
  // Se puede pagar de una vez solo si el precio es fijo
  const fixedPrice = product.kind !== 'personalizado' && !product.price_is_from && product.price > 0
  const fullName = variant ? `${product.name} (${variant})` : product.name

  const orderMessage = fixedPrice
    ? `Hola CaLa, quiero pedir: ${fullName}. Ya hice la transferencia por ${formatCOP(product.price)} y adjunto el comprobante.`
    : `Hola CaLa, quiero cotizar: ${fullName}.`

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(value)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      setCopied(null)
    }
  }

  return (
    <div className="container page-pad">
      <nav className="crumbs" aria-label="Ruta">
        <Link to="/">Productos</Link>
        <span aria-hidden="true">/</span>
        <span>{product.name}</span>
      </nav>

      <div className="product">
        <div className="product__gallery">
          <div className="product__photo">
            {product.images.length > 0 ? (
              <img src={product.images[photo]} alt={product.name} />
            ) : (
              <div className="photo-placeholder" aria-hidden="true">
                <img src="/brand/isotipo-oscuro.png" alt="" />
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="product__thumbs">
              {product.images.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  aria-label={`Ver foto ${i + 1}`}
                  aria-pressed={i === photo}
                  onClick={() => setPhoto(i)}
                >
                  <img src={src} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="product__info">
          {tag && <span className="product__tag">{tag}</span>}
          <h1>{product.name}</h1>
          <p className="product__price">{priceLabel(product)}</p>
          {product.short_description && (
            <p className="product__lead">{product.short_description}</p>
          )}

          {product.variants.length > 0 && (
            <fieldset className="product__variants">
              <legend>Opción</legend>
              <div className="chips">
                {product.variants.map((v) => (
                  <button
                    key={v}
                    type="button"
                    className="chip"
                    aria-pressed={variant === v}
                    onClick={() => setVariant(v)}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {product.is_combo && product.includes.length > 0 && (
            <div className="product__includes">
              <h2>Este combo incluye</h2>
              <ul>
                {product.includes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          <dl className="product__meta">
            <div>
              <dt>Producción</dt>
              <dd>{production}</dd>
            </div>
            <div>
              <dt>Entrega</dt>
              <dd>{settings.shipping_note}</dd>
            </div>
            {product.requires_reference_photo && (
              <div>
                <dt>Personalización</dt>
                <dd>Necesitamos fotos de referencia. Nos las envías por WhatsApp.</dd>
              </div>
            )}
          </dl>

          {fixedPrice ? (
            <>
              <button
                type="button"
                className="btn btn--dark btn--wide"
                aria-expanded={showPayment}
                aria-controls="datos-pago"
                onClick={() => setShowPayment((v) => !v)}
              >
                {showPayment ? 'Ocultar datos de pago' : 'Comprar'}
              </button>

              {showPayment && (
                <div className="pay" id="datos-pago">
                  <ol className="pay__steps">
                    <li>
                      <h2>Transfiere {formatCOP(product.price)}</h2>
                      {settings.payment_methods.length === 0 ? (
                        <p>Escríbenos por WhatsApp y te enviamos los datos de pago.</p>
                      ) : (
                        <ul className="pay__methods">
                          {settings.payment_methods.map((m) => (
                            <li key={m.label + m.value}>
                              <div>
                                <span className="pay__label">{m.label}</span>
                                <span className="pay__value">{m.value}</span>
                                {m.holder && <span className="pay__holder">{m.holder}</span>}
                              </div>
                              <button
                                type="button"
                                className="btn btn--ghost btn--small"
                                onClick={() => copy(m.value)}
                              >
                                {copied === m.value ? 'Copiado' : 'Copiar'}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <p className="pay__note">El envío se paga aparte al coordinar la entrega.</p>
                    </li>
                    <li>
                      <h2>Envíanos el comprobante</h2>
                      <p>
                        Con el comprobante empezamos tu pedido.
                        {product.requires_reference_photo &&
                          ' Adjunta también tus fotos de referencia.'}
                      </p>
                      {hasWhatsApp && (
                        <a
                          className="btn btn--wa btn--wide"
                          href={whatsappLink(settings.whatsapp_number, orderMessage)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <FaWhatsapp aria-hidden="true" />
                          Enviar comprobante por WhatsApp
                        </a>
                      )}
                    </li>
                  </ol>
                </div>
              )}
            </>
          ) : (
            <>
              {hasWhatsApp && (
                <a
                  className="btn btn--wa btn--wide"
                  href={whatsappLink(settings.whatsapp_number, orderMessage)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FaWhatsapp aria-hidden="true" />
                  Cotizar por WhatsApp
                </a>
              )}
              <p className="pay__note">
                El precio depende de tu pedido. Te lo confirmamos por WhatsApp junto con los datos
                de pago.
              </p>
            </>
          )}
        </div>
      </div>

      {product.description && (
        <section className="product__description">
          <h2>Detalles</h2>
          {product.description.split(/\n{2,}/).map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </section>
      )}
    </div>
  )
}
