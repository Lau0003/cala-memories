type Section = 'ordenes' | 'tareas' | 'cotizador' | 'inventario' | 'lanzamientos' | 'contenido'

const INFO: Record<Section, { title: string; phase: string; items: string[] }> = {
  ordenes: {
    title: 'Órdenes',
    phase: 'Fase 2',
    items: [
      'Crear órdenes a partir de un producto publicado o 100 % personalizadas.',
      'Datos del cliente, dirección y fotos de referencia según lo que pida cada producto.',
      'Estado, fechas y avance paso a paso de la producción.',
      'Pago registrado y casilla «producir sin pago anticipado».',
    ],
  },
  tareas: {
    title: 'Tareas',
    phase: 'Fase 2',
    items: [
      'Pendientes asignados a cada uno de los dos usuarios.',
      'Fecha límite y vínculo opcional con una orden.',
    ],
  },
  cotizador: {
    title: 'Cotizador',
    phase: 'Fase 3',
    items: [
      'Costo de material, energía, desgaste, merma, mano de obra y embalaje.',
      'Precios sugeridos al 30, 35 y 40 % de ganancia.',
      'Tú escribes el precio final y ves la ganancia real.',
    ],
  },
  inventario: {
    title: 'Inventario',
    phase: 'Fase 3',
    items: [
      'Registro de compras de rollos, pinturas y embalaje.',
      'Costo por gramo calculado a partir de las compras.',
      'Descuento automático de material al confirmar una orden.',
    ],
  },
  lanzamientos: {
    title: 'Lanzamientos',
    phase: 'Fase 4',
    items: [
      'Productos futuros con fecha objetivo y estado.',
      'Cada tarjeta con enlaces a su material audiovisual.',
    ],
  },
  contenido: {
    title: 'Contenido',
    phase: 'Fase 4',
    items: [
      'Ideas y pendientes de videos, shorts y publicaciones.',
      'Programación por red social y fecha.',
    ],
  },
}

export default function ComingSoon({ section }: { section: Section }) {
  const info = INFO[section]

  return (
    <>
      <header className="admin-head">
        <h1>{info.title}</h1>
      </header>
      <section className="card">
        <h2>Llega en la {info.phase.toLowerCase()}</h2>
        <p className="muted">
          La base de datos ya está preparada para esta sección. Esto es lo que tendrá:
        </p>
        <ul className="plain-list">
          {info.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </>
  )
}
