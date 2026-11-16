import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  SUPPLY_TYPE_LABELS,
  type Supply,
  type SupplyType,
  type SupplyUnit,
} from '../../lib/adminTypes'
import { useAuth } from '../../lib/auth'
import { todayISO } from '../../lib/dates'
import { errorText, formatCOP } from '../../lib/format'
import { supabase } from '../../lib/supabase'

type Panel = { supplyId: string; mode: 'compra' | 'ajuste' } | null

/** Costo legible: los filamentos se muestran por kilo, que es como se compran. */
export function unitCostLabel(supply: Supply): string {
  const cost = Number(supply.avg_unit_cost)
  if (cost <= 0) return 'Sin costo registrado'
  if (supply.unit === 'g') return `${formatCOP(cost * 1000)} por kg`
  if (supply.unit === 'ml') return `${formatCOP(cost * 1000)} por litro`
  return `${formatCOP(cost)} por unidad`
}

export default function Inventory() {
  const { userId } = useAuth()
  const [supplies, setSupplies] = useState<Supply[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [panel, setPanel] = useState<Panel>(null)

  // nuevo insumo
  const [name, setName] = useState('')
  const [type, setType] = useState<SupplyType>('filamento')
  const [color, setColor] = useState('')
  const [unit, setUnit] = useState<SupplyUnit>('g')

  // compra o ajuste
  const [qty, setQty] = useState('')
  const [cost, setCost] = useState('')

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('supplies')
      .select('*')
      .eq('active', true)
      .order('type')
      .order('name')
    if (err) setError(errorText(err))
    setSupplies((data as Supply[] | null) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function changeType(next: SupplyType) {
    setType(next)
    setUnit(next === 'filamento' ? 'g' : next === 'pintura' ? 'ml' : 'unidad')
  }

  async function handleAdd(event: FormEvent) {
    event.preventDefault()
    const value = name.trim()
    if (!value) return
    setError(null)
    const { error: err } = await supabase
      .from('supplies')
      .insert({ name: value, type, color: color.trim(), unit })
    if (err) {
      setError(`No se pudo crear el insumo: ${errorText(err)}`)
      return
    }
    setName('')
    setColor('')
    load()
  }

  function openPanel(supplyId: string, mode: 'compra' | 'ajuste') {
    setQty('')
    setCost('')
    setError(null)
    setPanel(panel?.supplyId === supplyId && panel.mode === mode ? null : { supplyId, mode })
  }

  async function handlePurchase(event: FormEvent, supply: Supply) {
    event.preventDefault()
    const bought = Number(qty)
    const total = Number(cost)
    if (!(bought > 0) || !(total >= 0)) {
      setError('Escribe la cantidad comprada y cuánto costó.')
      return
    }
    const stock = Math.max(0, Number(supply.stock_qty))
    const prevCost = Number(supply.avg_unit_cost)
    // Costo promedio: lo que quedaba a su costo + lo nuevo a su precio
    const average = (stock * prevCost + total) / (stock + bought)

    const purchase = await supabase.from('supply_purchases').insert({
      supply_id: supply.id,
      qty: bought,
      total_cost: Math.round(total),
      purchased_at: todayISO(),
      created_by: userId,
    })
    if (purchase.error) {
      setError(`No se pudo registrar la compra: ${errorText(purchase.error)}`)
      return
    }
    const update = await supabase
      .from('supplies')
      .update({ stock_qty: stock + bought, avg_unit_cost: average })
      .eq('id', supply.id)
    if (update.error) setError(errorText(update.error))
    setPanel(null)
    load()
  }

  async function handleAdjust(event: FormEvent, supply: Supply) {
    event.preventDefault()
    const next = Number(qty)
    if (qty === '' || !(next >= 0)) {
      setError('Escribe cuánto queda realmente.')
      return
    }
    const diff = next - Number(supply.stock_qty)
    const movement = await supabase.from('supply_movements').insert({
      supply_id: supply.id,
      qty: diff,
      reason: 'Ajuste de inventario',
      created_by: userId,
    })
    if (movement.error) {
      setError(errorText(movement.error))
      return
    }
    const update = await supabase.from('supplies').update({ stock_qty: next }).eq('id', supply.id)
    if (update.error) setError(errorText(update.error))
    setPanel(null)
    load()
  }

  async function archive(supply: Supply) {
    if (!window.confirm(`¿Quitar «${supply.name}» del inventario? Su historial se conserva.`)) return
    const { error: err } = await supabase
      .from('supplies')
      .update({ active: false })
      .eq('id', supply.id)
    if (err) setError(errorText(err))
    load()
  }

  return (
    <>
      <header className="admin-head">
        <h1>Inventario</h1>
      </header>

      <p className="muted">
        Registra cada compra de rollos, pinturas o embalaje. Con eso se calcula el costo que usa
        el cotizador, y el material que gastes en una orden se descuenta desde la orden.
      </p>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <form className="card" onSubmit={handleAdd}>
        <h2>Nuevo insumo</h2>
        <div className="field-row">
          <label className="field">
            <span>Nombre</span>
            <input
              type="text"
              placeholder="Ej. PLA mate"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Color (opcional)</span>
            <input type="text" value={color} onChange={(e) => setColor(e.target.value)} />
          </label>
        </div>
        <div className="field-row">
          <label className="field">
            <span>Tipo</span>
            <select value={type} onChange={(e) => changeType(e.target.value as SupplyType)}>
              {(Object.keys(SUPPLY_TYPE_LABELS) as SupplyType[]).map((t) => (
                <option key={t} value={t}>
                  {SUPPLY_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Se mide en</span>
            <select value={unit} onChange={(e) => setUnit(e.target.value as SupplyUnit)}>
              <option value="g">Gramos</option>
              <option value="ml">Mililitros</option>
              <option value="unidad">Unidades</option>
            </select>
          </label>
        </div>
        <button type="submit" className="btn btn--dark">
          Agregar insumo
        </button>
      </form>

      {loading && <p className="muted">Cargando…</p>}

      {!loading && supplies.length === 0 && (
        <p className="muted">Aún no hay insumos. Agrega el primero arriba.</p>
      )}

      {supplies.length > 0 && (
        <ul className="rows">
          {supplies.map((supply) => {
            const open = panel?.supplyId === supply.id ? panel.mode : null
            const empty = Number(supply.stock_qty) <= 0
            return (
              <li key={supply.id} className="row row--wrap">
                <div className="row__main">
                  <span className="row__title">
                    {supply.name}
                    {supply.color ? ` ${supply.color}` : ''}
                  </span>
                  <span className="row__meta">
                    {SUPPLY_TYPE_LABELS[supply.type]}, {unitCostLabel(supply)}
                  </span>
                </div>
                <div className="row__actions">
                  <span className={`badge ${empty ? 'badge--warn' : 'badge--soft'}`}>
                    {empty ? 'Agotado' : `${Number(supply.stock_qty)} ${supply.unit}`}
                  </span>
                  <button
                    type="button"
                    className="btn btn--ghost btn--small"
                    aria-expanded={open === 'compra'}
                    onClick={() => openPanel(supply.id, 'compra')}
                  >
                    Registrar compra
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--small"
                    aria-expanded={open === 'ajuste'}
                    onClick={() => openPanel(supply.id, 'ajuste')}
                  >
                    Ajustar
                  </button>
                </div>

                {open === 'compra' && (
                  <form className="row__panel" onSubmit={(e) => handlePurchase(e, supply)}>
                    <div className="field-row">
                      <label className="field">
                        <span>Cantidad comprada ({supply.unit})</span>
                        <input
                          type="number"
                          min={0}
                          step="any"
                          placeholder={supply.unit === 'g' ? 'Ej. 1000 para un rollo de 1 kg' : ''}
                          value={qty}
                          onChange={(e) => setQty(e.target.value)}
                        />
                      </label>
                      <label className="field">
                        <span>Costo total (COP)</span>
                        <input
                          type="number"
                          min={0}
                          step={100}
                          value={cost}
                          onChange={(e) => setCost(e.target.value)}
                        />
                      </label>
                    </div>
                    <button type="submit" className="btn btn--dark btn--small">
                      Guardar compra
                    </button>
                  </form>
                )}

                {open === 'ajuste' && (
                  <form className="row__panel" onSubmit={(e) => handleAdjust(e, supply)}>
                    <label className="field field--short">
                      <span>Cantidad real que queda ({supply.unit})</span>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        placeholder="0 si se acabó"
                        value={qty}
                        onChange={(e) => setQty(e.target.value)}
                      />
                    </label>
                    <div className="shortcuts">
                      <button type="submit" className="btn btn--dark btn--small">
                        Guardar ajuste
                      </button>
                      <button
                        type="button"
                        className="btn btn--danger btn--small"
                        onClick={() => archive(supply)}
                      >
                        Quitar del inventario
                      </button>
                    </div>
                  </form>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
