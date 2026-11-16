import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import type { CostSettings, Quote, QuoteInputs, QuoteMaterial, Supply } from '../../lib/adminTypes'
import { useAuth } from '../../lib/auth'
import { formatDate } from '../../lib/dates'
import { errorText, formatCOP } from '../../lib/format'
import { computeQuote, marginOf, suggestPrice } from '../../lib/quote'
import { supabase } from '../../lib/supabase'
import { unitCostLabel } from './Inventory'

const DEFAULT_SETTINGS: CostSettings = {
  labor_rate: 0,
  kwh_price: 0,
  printer_watts: 0,
  wear_pct: 5,
  waste_pct: 10,
  packaging_fee: 0,
}

const MARGINS = [30, 35, 40]

interface ProductOption {
  id: string
  name: string
}

function num(value: string): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : 0
}

export default function Quoter() {
  const { userId } = useAuth()
  const [settings, setSettings] = useState<CostSettings>(DEFAULT_SETTINGS)
  const [supplies, setSupplies] = useState<Supply[]>([])
  const [products, setProducts] = useState<ProductOption[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  // cotización en curso
  const [title, setTitle] = useState('')
  const [productId, setProductId] = useState('')
  const [materials, setMaterials] = useState<QuoteMaterial[]>([])
  const [pickSupply, setPickSupply] = useState('')
  const [pickQty, setPickQty] = useState('')
  const [printHours, setPrintHours] = useState('')
  const [laborHours, setLaborHours] = useState('')
  const [extras, setExtras] = useState('')
  const [packaging, setPackaging] = useState(true)
  const [finalPrice, setFinalPrice] = useState('')

  const load = useCallback(async () => {
    const [cs, sup, prod, q] = await Promise.all([
      supabase.from('cost_settings').select('*').eq('id', 1).maybeSingle(),
      supabase.from('supplies').select('*').eq('active', true).order('name'),
      supabase.from('products').select('id, name').order('name'),
      supabase.from('quotes').select('*').order('created_at', { ascending: false }),
    ])
    if (cs.data) {
      const d = cs.data as Record<keyof CostSettings, number | string>
      // Si aún no se han configurado, se muestran abiertos
      if (Number(d.labor_rate) === 0 && Number(d.kwh_price) === 0) setShowSettings(true)
      setSettings({
        labor_rate: Number(d.labor_rate),
        kwh_price: Number(d.kwh_price),
        printer_watts: Number(d.printer_watts),
        wear_pct: Number(d.wear_pct),
        waste_pct: Number(d.waste_pct),
        packaging_fee: Number(d.packaging_fee),
      })
    }
    setSupplies((sup.data as Supply[] | null) ?? [])
    setProducts((prod.data as ProductOption[] | null) ?? [])
    setQuotes((q.data as Quote[] | null) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const inputs: QuoteInputs = useMemo(
    () => ({
      materials,
      print_hours: num(printHours),
      labor_hours: num(laborHours),
      extras: num(extras),
      include_packaging: packaging,
    }),
    [materials, printHours, laborHours, extras, packaging],
  )

  const breakdown = useMemo(() => computeQuote(inputs, settings), [inputs, settings])
  const price = num(finalPrice)
  const profit = price - breakdown.total

  function setSetting(key: keyof CostSettings, value: string) {
    setSettings((s) => ({ ...s, [key]: num(value) }))
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    const { error: err } = await supabase.from('cost_settings').update(settings).eq('id', 1)
    if (err) setError(`No se pudieron guardar los parámetros: ${errorText(err)}`)
    else setMessage('Parámetros guardados.')
  }

  function addMaterial() {
    const supply = supplies.find((s) => s.id === pickSupply)
    const qty = num(pickQty)
    if (!supply || qty <= 0) {
      setError('Elige un insumo y escribe cuánto se usa.')
      return
    }
    setError(null)
    setMaterials((list) => [
      ...list.filter((m) => m.supply_id !== supply.id),
      {
        supply_id: supply.id,
        name: `${supply.name}${supply.color ? ` ${supply.color}` : ''} (${supply.unit})`,
        unit_cost: Number(supply.avg_unit_cost),
        qty,
      },
    ])
    setPickQty('')
  }

  function reset() {
    setTitle('')
    setProductId('')
    setMaterials([])
    setPrintHours('')
    setLaborHours('')
    setExtras('')
    setPackaging(true)
    setFinalPrice('')
  }

  function openQuote(quote: Quote) {
    setTitle(quote.title)
    setProductId(quote.product_id ?? '')
    setMaterials(quote.inputs.materials ?? [])
    setPrintHours(String(quote.inputs.print_hours || ''))
    setLaborHours(String(quote.inputs.labor_hours || ''))
    setExtras(String(quote.inputs.extras || ''))
    setPackaging(quote.inputs.include_packaging ?? true)
    setFinalPrice(String(quote.final_price || ''))
    setMessage(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function saveQuote(applyToProduct: boolean) {
    setError(null)
    setMessage(null)
    const name = title.trim()
    if (!name) {
      setError('Ponle un nombre a la cotización para guardarla.')
      return
    }
    if (applyToProduct && (!productId || price <= 0)) {
      setError('Para aplicar el precio, elige un producto y escribe el precio final.')
      return
    }
    const { error: err } = await supabase.from('quotes').insert({
      title: name,
      product_id: productId || null,
      inputs,
      cost_total: Math.round(breakdown.total),
      suggested_price: suggestPrice(breakdown.total, 35),
      final_price: Math.round(price),
      created_by: userId,
    })
    if (err) {
      setError(`No se pudo guardar: ${errorText(err)}`)
      return
    }
    if (applyToProduct) {
      const update = await supabase
        .from('products')
        .update({ price: Math.round(price) })
        .eq('id', productId)
      if (update.error) {
        setError(`La cotización se guardó, pero no se pudo cambiar el precio: ${errorText(update.error)}`)
        load()
        return
      }
      setMessage('Cotización guardada y precio del producto actualizado.')
    } else {
      setMessage('Cotización guardada.')
    }
    load()
  }

  async function removeQuote(quote: Quote) {
    if (!window.confirm(`¿Eliminar la cotización «${quote.title}»?`)) return
    const { error: err } = await supabase.from('quotes').delete().eq('id', quote.id)
    if (err) setError(errorText(err))
    load()
  }

  if (loading) return <p className="muted">Cargando…</p>

  const lines: [string, number][] = [
    ['Material', breakdown.material],
    [`Merma (${settings.waste_pct} %)`, breakdown.waste],
    ['Energía de impresión', breakdown.energy],
    [`Desgaste de máquina (${settings.wear_pct} %)`, breakdown.wear],
    ['Mano de obra', breakdown.labor],
    ['Embalaje', breakdown.packaging],
    ['Otros costos', breakdown.extras],
  ]

  return (
    <>
      <header className="admin-head">
        <h1>Cotizador</h1>
        <button type="button" className="btn btn--ghost btn--small" onClick={reset}>
          Empezar de cero
        </button>
      </header>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="form-ok" role="status">
          {message}
        </p>
      )}

      <details
        className="card"
        open={showSettings}
        onToggle={(e) => setShowSettings((e.target as HTMLDetailsElement).open)}
      >
        <summary>
          <h2>Parámetros de costo</h2>
          <span className="muted">Se configuran una vez y aplican a todas las cotizaciones.</span>
        </summary>
        <form onSubmit={saveSettings}>
          <div className="field-row">
            <label className="field">
              <span>Valor de tu hora de trabajo (COP)</span>
              <input
                type="number"
                min={0}
                step={100}
                value={settings.labor_rate || ''}
                onChange={(e) => setSetting('labor_rate', e.target.value)}
              />
            </label>
            <label className="field">
              <span>Embalaje por pedido (COP)</span>
              <input
                type="number"
                min={0}
                step={100}
                value={settings.packaging_fee || ''}
                onChange={(e) => setSetting('packaging_fee', e.target.value)}
              />
            </label>
          </div>
          <div className="field-row">
            <label className="field">
              <span>Tarifa de energía (COP por kWh)</span>
              <input
                type="number"
                min={0}
                step="any"
                value={settings.kwh_price || ''}
                onChange={(e) => setSetting('kwh_price', e.target.value)}
              />
              <small>Sale en tu factura de energía.</small>
            </label>
            <label className="field">
              <span>Consumo de la impresora (vatios)</span>
              <input
                type="number"
                min={0}
                step="any"
                value={settings.printer_watts || ''}
                onChange={(e) => setSetting('printer_watts', e.target.value)}
              />
              <small>Consumo promedio mientras imprime, según el fabricante.</small>
            </label>
          </div>
          <div className="field-row">
            <label className="field">
              <span>Desgaste de máquina (%)</span>
              <input
                type="number"
                min={0}
                step="any"
                value={settings.wear_pct || ''}
                onChange={(e) => setSetting('wear_pct', e.target.value)}
              />
            </label>
            <label className="field">
              <span>Merma (%)</span>
              <input
                type="number"
                min={0}
                step="any"
                value={settings.waste_pct || ''}
                onChange={(e) => setSetting('waste_pct', e.target.value)}
              />
              <small>Cubre impresiones fallidas y material desperdiciado.</small>
            </label>
          </div>
          <button type="submit" className="btn btn--dark btn--small">
            Guardar parámetros
          </button>
        </form>
      </details>

      <section className="card">
        <h2>Datos de la pieza</h2>
        <div className="field-row">
          <label className="field">
            <span>Nombre de la cotización</span>
            <input
              type="text"
              placeholder="Ej. Funko pareja con base"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Producto del catálogo (opcional)</span>
            <select value={productId} onChange={(e) => setProductId(e.target.value)}>
              <option value="">Ninguno</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <h3>Materiales</h3>
        {supplies.length === 0 ? (
          <p className="muted">
            Registra tus rollos en Inventario para que el costo del material se calcule solo.
          </p>
        ) : (
          <>
            {materials.length > 0 && (
              <ul className="plain-list">
                {materials.map((m) => (
                  <li key={m.supply_id} className="split">
                    <span>
                      {m.qty} de {m.name}
                    </span>
                    <span className="split__end">
                      {formatCOP(m.qty * m.unit_cost)}
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Quitar ${m.name}`}
                        onClick={() =>
                          setMaterials((list) => list.filter((x) => x.supply_id !== m.supply_id))
                        }
                      >
                        ×
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="inline-form">
              <label className="field">
                <span>Insumo</span>
                <select value={pickSupply} onChange={(e) => setPickSupply(e.target.value)}>
                  <option value="">Elegir…</option>
                  {supplies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.color ? ` ${s.color}` : ''} ({unitCostLabel(s)})
                    </option>
                  ))}
                </select>
              </label>
              <label className="field field--tiny">
                <span>Cantidad</span>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={pickQty}
                  onChange={(e) => setPickQty(e.target.value)}
                />
              </label>
              <button type="button" className="btn btn--ghost" onClick={addMaterial}>
                Agregar
              </button>
            </div>
          </>
        )}

        <h3>Tiempos y otros costos</h3>
        <div className="field-row">
          <label className="field">
            <span>Horas de impresión</span>
            <input
              type="number"
              min={0}
              step="any"
              value={printHours}
              onChange={(e) => setPrintHours(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Horas de trabajo manual</span>
            <input
              type="number"
              min={0}
              step="any"
              value={laborHours}
              onChange={(e) => setLaborHours(e.target.value)}
            />
            <small>Modelado, lijado, pintura, empaque.</small>
          </label>
        </div>
        <label className="field field--short">
          <span>Otros costos (COP)</span>
          <input
            type="number"
            min={0}
            step={100}
            value={extras}
            onChange={(e) => setExtras(e.target.value)}
          />
          <small>Ej. chip NFC, argollas, luces.</small>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={packaging}
            onChange={(e) => setPackaging(e.target.checked)}
          />
          <span>Incluir embalaje ({formatCOP(settings.packaging_fee)})</span>
        </label>
      </section>

      <section className="card">
        <h2>Resultado</h2>
        <table className="quote-table">
          <tbody>
            {lines.map(([label, value]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td>{formatCOP(value)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Costo total</th>
              <td>{formatCOP(breakdown.total)}</td>
            </tr>
          </tfoot>
        </table>

        <h3>Precio sugerido</h3>
        <p className="muted">
          Para que la ganancia sea ese porcentaje del precio final. Toca uno para usarlo.
        </p>
        <div className="suggestions">
          {MARGINS.map((margin) => {
            const suggested = suggestPrice(breakdown.total, margin)
            return (
              <button
                key={margin}
                type="button"
                className="suggestion"
                disabled={suggested === 0}
                onClick={() => setFinalPrice(String(suggested))}
              >
                <span>{margin} %</span>
                <strong>{formatCOP(suggested)}</strong>
              </button>
            )
          })}
        </div>

        <label className="field field--short">
          <span>Precio final que vas a cobrar (COP)</span>
          <input
            type="number"
            min={0}
            step={100}
            value={finalPrice}
            onChange={(e) => setFinalPrice(e.target.value)}
          />
        </label>

        {price > 0 && (
          <p className={`callout ${profit < 0 ? 'callout--warn' : ''}`}>
            {profit >= 0
              ? `Ganancia: ${formatCOP(profit)}, el ${marginOf(breakdown.total, price).toFixed(1)} % del precio. Tu mano de obra (${formatCOP(breakdown.labor)}) va aparte, dentro del costo.`
              : `Con ese precio pierdes ${formatCOP(-profit)}: no alcanza a cubrir el costo.`}
          </p>
        )}

        <div className="shortcuts">
          <button type="button" className="btn btn--dark" onClick={() => saveQuote(false)}>
            Guardar cotización
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => saveQuote(true)}>
            Guardar y poner este precio al producto
          </button>
        </div>
      </section>

      <section className="card">
        <h2>Cotizaciones guardadas</h2>
        {quotes.length === 0 ? (
          <p className="muted">Aún no has guardado cotizaciones.</p>
        ) : (
          <ul className="plain-list">
            {quotes.map((quote) => (
              <li key={quote.id} className="split">
                <span>
                  <strong>{quote.title}</strong>
                  <small className="muted block">
                    Costo {formatCOP(quote.cost_total)}, precio {formatCOP(quote.final_price)},{' '}
                    {formatDate(quote.created_at)}
                  </small>
                </span>
                <span className="split__end">
                  <button
                    type="button"
                    className="btn btn--ghost btn--small"
                    onClick={() => openQuote(quote)}
                  >
                    Abrir
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Eliminar ${quote.title}`}
                    onClick={() => removeQuote(quote)}
                  >
                    ×
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
