interface LogoProps {
  /** "oscuro" para fondos claros, "claro" para fondos oscuros. */
  tone?: 'oscuro' | 'claro'
  /** Muestra solo el cubo, sin el nombre. */
  iconOnly?: boolean
}

/**
 * Logo del encabezado: isotipo + nombre.
 * Para cambiarlo, reemplaza los archivos de la carpeta public/brand
 * conservando los mismos nombres.
 */
export default function Logo({ tone = 'oscuro', iconOnly = false }: LogoProps) {
  return (
    <span className={`logo logo--${tone}`}>
      <img src={`/brand/isotipo-${tone}.png`} alt="" className="logo__mark" />
      {!iconOnly && (
        <span className="logo__text">
          <span className="logo__name">CaLa</span>
          <span className="logo__sub">memories</span>
        </span>
      )}
      {iconOnly && <span className="sr-only">CaLa memories</span>}
    </span>
  )
}
