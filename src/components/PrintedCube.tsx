/**
 * Ilustración del inicio: el cubo del logo "imprimiéndose" capa por capa,
 * como lo hace una impresora 3D. La animación corre una sola vez al cargar.
 */
export default function PrintedCube() {
  const layers = Array.from({ length: 13 }, (_, i) => 230 - i * 10.5)

  return (
    <svg
      className="printed-cube"
      viewBox="0 0 320 320"
      role="img"
      aria-label="Cubo impreso en 3D capa por capa"
    >
      {/* cara superior */}
      <path className="printed-cube__top" d="M160 30 L270 93 L160 156 L50 93 Z" />

      {/* capas de impresión en las dos caras laterales */}
      <g className="printed-cube__layers">
        {layers.map((y, i) => (
          <polyline
            key={y}
            points={`50,${y} 160,${y + 63} 270,${y}`}
            style={{ animationDelay: `${0.25 + i * 0.09}s` }}
          />
        ))}
      </g>

      {/* contorno, con el mismo trazo grueso y redondeado del logo */}
      <g className="printed-cube__outline">
        <path d="M160 30 L270 93 L270 227 L160 290 L50 227 L50 93 Z" />
        <path d="M50 93 L160 156 L270 93" />
        <path d="M160 156 L160 290" />
      </g>
    </svg>
  )
}
