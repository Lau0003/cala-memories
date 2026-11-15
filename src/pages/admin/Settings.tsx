import { useEffect, useState, type FormEvent } from 'react'
import { useSettings } from '../../lib/settings'
import { supabase } from '../../lib/supabase'
import { errorText } from '../../lib/format'
import type { PaymentMethod, Policy, SiteSettings } from '../../lib/types'

export default function Settings() {
  const { settings, loaded, reload } = useSettings()
  const [form, setForm] = useState<SiteSettings>(settings)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (loaded) setForm(settings)
  }, [loaded, settings])

  function set<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    setSaved(false)
  }

  function setMethod(index: number, patch: Partial<PaymentMethod>) {
    set(
      'payment_methods',
      form.payment_methods.map((m, i) => (i === index ? { ...m, ...patch } : m)),
    )
  }

  function setPolicy(index: number, patch: Partial<Policy>) {
    set(
      'policies',
      form.policies.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    )
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (form.production_min_days > form.production_max_days) {
      setError('En el tiempo de producción, el mínimo no puede ser mayor que el máximo.')
      return
    }

    setSaving(true)
    const { error: err } = await supabase
      .from('site_settings')
      .update({
        whatsapp_number: form.whatsapp_number.replace(/\D/g, ''),
        hero_title: form.hero_title.trim(),
        hero_subtitle: form.hero_subtitle.trim(),
        production_min_days: form.production_min_days,
        production_max_days: form.production_max_days,
        shipping_note: form.shipping_note.trim(),
        payment_methods: form.payment_methods.filter((m) => m.label.trim() && m.value.trim()),
        policies: form.policies.filter((p) => p.title.trim() && p.body.trim()),
        instagram_url: form.instagram_url.trim(),
        facebook_url: form.facebook_url.trim(),
        tiktok_url: form.tiktok_url.trim(),
      })
      .eq('id', 1)
    setSaving(false)

    if (err) {
      setError(`No se pudo guardar: ${errorText(err)}`)
      return
    }
    await reload()
    setSaved(true)
  }

  if (!loaded) return <p className="muted">Cargando…</p>

  return (
    <form onSubmit={handleSubmit} className="form">
      <header className="admin-head">
        <h1>Ajustes de la tienda</h1>
      </header>

      <section className="card">
        <h2>WhatsApp</h2>
        <label className="field field--short">
          <span>Número con indicativo del país</span>
          <input
            type="tel"
            inputMode="numeric"
            placeholder="573001234567"
            value={form.whatsapp_number}
            onChange={(e) => set('whatsapp_number', e.target.value)}
          />
          <small>Solo números: 57 + el celular, sin espacios ni el signo +.</small>
        </label>
      </section>

      <section className="card">
        <h2>Datos de pago</h2>
        <p className="muted">
          Aparecen cuando el cliente toca «Comprar» en un producto de precio fijo.
        </p>
        {form.payment_methods.map((method, index) => (
          <div key={index} className="repeater">
            <div className="field-row">
              <label className="field">
                <span>Medio</span>
                <input
                  type="text"
                  placeholder="Ej. Llave Bre-B, Nequi, Bancolombia Ahorros"
                  value={method.label}
                  onChange={(e) => setMethod(index, { label: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Número o llave</span>
                <input
                  type="text"
                  value={method.value}
                  onChange={(e) => setMethod(index, { value: e.target.value })}
                />
              </label>
            </div>
            <label className="field">
              <span>Titular</span>
              <input
                type="text"
                value={method.holder}
                onChange={(e) => setMethod(index, { holder: e.target.value })}
              />
            </label>
            <button
              type="button"
              className="btn btn--danger btn--small"
              onClick={() =>
                set(
                  'payment_methods',
                  form.payment_methods.filter((_, i) => i !== index),
                )
              }
            >
              Quitar este medio
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn--ghost btn--small"
          onClick={() =>
            set('payment_methods', [...form.payment_methods, { label: '', value: '', holder: '' }])
          }
        >
          Agregar medio de pago
        </button>
      </section>

      <section className="card">
        <h2>Producción y entrega</h2>
        <div className="field-row">
          <label className="field">
            <span>Mínimo (días hábiles)</span>
            <input
              type="number"
              min={0}
              required
              value={form.production_min_days}
              onChange={(e) => set('production_min_days', Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span>Máximo (días hábiles)</span>
            <input
              type="number"
              min={0}
              required
              value={form.production_max_days}
              onChange={(e) => set('production_max_days', Number(e.target.value))}
            />
          </label>
        </div>
        <label className="field">
          <span>Nota de entrega</span>
          <input
            type="text"
            value={form.shipping_note}
            onChange={(e) => set('shipping_note', e.target.value)}
          />
        </label>
      </section>

      <section className="card">
        <h2>Inicio de la tienda</h2>
        <label className="field">
          <span>Título</span>
          <input
            type="text"
            value={form.hero_title}
            onChange={(e) => set('hero_title', e.target.value)}
          />
        </label>
        <label className="field">
          <span>Texto de apoyo</span>
          <textarea
            rows={3}
            value={form.hero_subtitle}
            onChange={(e) => set('hero_subtitle', e.target.value)}
          />
        </label>
      </section>

      <section className="card">
        <h2>Políticas</h2>
        <p className="muted">Se muestran en la página «Políticas» de la tienda.</p>
        {form.policies.map((policy, index) => (
          <div key={index} className="repeater">
            <label className="field">
              <span>Título</span>
              <input
                type="text"
                value={policy.title}
                onChange={(e) => setPolicy(index, { title: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Texto</span>
              <textarea
                rows={3}
                value={policy.body}
                onChange={(e) => setPolicy(index, { body: e.target.value })}
              />
            </label>
            <button
              type="button"
              className="btn btn--danger btn--small"
              onClick={() =>
                set(
                  'policies',
                  form.policies.filter((_, i) => i !== index),
                )
              }
            >
              Quitar esta política
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn--ghost btn--small"
          onClick={() => set('policies', [...form.policies, { title: '', body: '' }])}
        >
          Agregar política
        </button>
      </section>

      <section className="card">
        <h2>Redes sociales</h2>
        <label className="field">
          <span>Instagram</span>
          <input
            type="url"
            placeholder="https://instagram.com/…"
            value={form.instagram_url}
            onChange={(e) => set('instagram_url', e.target.value)}
          />
        </label>
        <label className="field">
          <span>TikTok</span>
          <input
            type="url"
            placeholder="https://tiktok.com/@…"
            value={form.tiktok_url}
            onChange={(e) => set('tiktok_url', e.target.value)}
          />
        </label>
        <label className="field">
          <span>Facebook</span>
          <input
            type="url"
            placeholder="https://facebook.com/…"
            value={form.facebook_url}
            onChange={(e) => set('facebook_url', e.target.value)}
          />
        </label>
      </section>

      <div className="form-bar">
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {saved && (
          <p className="form-ok" role="status">
            Ajustes guardados.
          </p>
        )}
        <div className="form-bar__actions">
          <button type="submit" className="btn btn--dark" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar ajustes'}
          </button>
        </div>
      </div>
    </form>
  )
}
