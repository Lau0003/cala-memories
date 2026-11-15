import { Link } from 'react-router-dom'
import type { PublicProduct } from '../lib/types'
import { formatCOP } from '../lib/format'

export function productTag(product: PublicProduct): string | null {
  if (product.is_combo) return 'Combo'
  if (product.kind === 'estandar_personalizado') return 'A partir de tu foto'
  if (product.kind === 'personalizado') return 'Diseño a tu medida'
  return null
}

export function priceLabel(product: PublicProduct): string {
  if (product.price <= 0) return 'Se cotiza'
  return product.price_is_from ? `Desde ${formatCOP(product.price)}` : formatCOP(product.price)
}

export default function ProductCard({ product }: { product: PublicProduct }) {
  const tag = productTag(product)
  const image = product.images[0]

  return (
    <Link to={`/producto/${product.slug}`} className="product-card">
      <div className="product-card__media">
        {image ? (
          <img src={image} alt={product.name} loading="lazy" />
        ) : (
          <div className="photo-placeholder" aria-hidden="true">
            <img src="/brand/isotipo-oscuro.png" alt="" />
          </div>
        )}
        {tag && <span className="product-card__tag">{tag}</span>}
      </div>
      <h3 className="product-card__name">{product.name}</h3>
      <p className="product-card__price">{priceLabel(product)}</p>
    </Link>
  )
}
