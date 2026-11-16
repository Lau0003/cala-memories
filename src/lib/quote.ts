import type { CostSettings, QuoteInputs } from './adminTypes'

export interface QuoteBreakdown {
  material: number
  waste: number
  energy: number
  wear: number
  labor: number
  packaging: number
  extras: number
  total: number
}

/**
 * Costo de fabricar un producto.
 *   Material   = cantidad usada x costo por unidad de cada insumo
 *   Merma      = % sobre el material (impresiones fallidas, desperdicio)
 *   Energía    = horas de impresión x consumo (kW) x tarifa del kWh
 *   Desgaste   = % sobre material + energía
 *   Mano obra  = horas de trabajo manual x valor de la hora
 *   Embalaje   = tarifa fija
 *   Extras     = cualquier otro costo puntual
 */
export function computeQuote(inputs: QuoteInputs, settings: CostSettings): QuoteBreakdown {
  const material = inputs.materials.reduce((sum, m) => sum + m.qty * m.unit_cost, 0)
  const waste = material * (settings.waste_pct / 100)
  const energy = inputs.print_hours * (settings.printer_watts / 1000) * settings.kwh_price
  const wear = (material + energy) * (settings.wear_pct / 100)
  const labor = inputs.labor_hours * settings.labor_rate
  const packaging = inputs.include_packaging ? settings.packaging_fee : 0
  const extras = inputs.extras
  const total = material + waste + energy + wear + labor + packaging + extras
  return { material, waste, energy, wear, labor, packaging, extras, total }
}

/**
 * Precio para que la ganancia sea el % indicado DEL PRECIO FINAL.
 * Ej: costo 20.000 con 35 % -> 30.800 (redondeado hacia arriba a la centena).
 */
export function suggestPrice(cost: number, marginPct: number): number {
  if (cost <= 0 || marginPct >= 100) return 0
  return Math.ceil(cost / (1 - marginPct / 100) / 100) * 100
}

/** Ganancia real, como % del precio final. */
export function marginOf(cost: number, price: number): number {
  if (price <= 0) return 0
  return ((price - cost) / price) * 100
}
