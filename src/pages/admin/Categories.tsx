import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { errorText, slugify } from '../../lib/format'
import type { Category } from '../../lib/types'

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function load() {
    const { data, error: err } = await supabase
      .from('categories')
      .select('id, name, slug, sort_order')
      .order('sort_order')
    if (err) setError(errorText(err))
    setCategories((data as Category[] | null) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleAdd(event: FormEvent) {
    event.preventDefault()
    const value = name.trim()
    if (!value) return
    setError(null)
    const nextOrder = categories.reduce((max, c) => Math.max(max, c.sort_order), 0) + 1
    const { error: err } = await supabase
      .from('categories')
      .insert({ name: value, slug: slugify(value), sort_order: nextOrder })
    if (err) {
      setError(
        err.code === '23505'
          ? 'Ya existe una categoría con ese nombre.'
          : `No se pudo crear: ${errorText(err)}`,
      )
      return
    }
    setName('')
    load()
  }

  async function rename(category: Category, value: string) {
    const next = value.trim()
    if (!next || next === category.name) return
    const { error: err } = await supabase
      .from('categories')
      .update({ name: next })
      .eq('id', category.id)
    if (err) setError(`No se pudo renombrar: ${errorText(err)}`)
    load()
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= categories.length) return
    const next = [...categories]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    setCategories(next)
    const results = await Promise.all(
      next.map((c, i) => supabase.from('categories').update({ sort_order: i + 1 }).eq('id', c.id)),
    )
    const failed = results.find((r) => r.error)
    if (failed?.error) setError(`No se pudo reordenar: ${errorText(failed.error)}`)
    load()
  }

  async function remove(category: Category) {
    if (
      !window.confirm(
        `¿Eliminar la categoría «${category.name}»? Sus productos quedarán sin categoría.`,
      )
    )
      return
    const { error: err } = await supabase.from('categories').delete().eq('id', category.id)
    if (err) setError(`No se pudo eliminar: ${errorText(err)}`)
    load()
  }

  return (
    <>
      <header className="admin-head">
        <h1>Categorías</h1>
      </header>

      <p className="muted">
        Sirven como filtros en la tienda. Solo aparecen las que tienen productos publicados.
      </p>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <form className="card inline-form" onSubmit={handleAdd}>
        <label className="field">
          <span>Nueva categoría</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <button type="submit" className="btn btn--dark">
          Agregar
        </button>
      </form>

      {loading && <p className="muted">Cargando…</p>}

      {!loading && categories.length === 0 && (
        <p className="muted">Aún no hay categorías. Agrega la primera arriba.</p>
      )}

      {categories.length > 0 && (
        <ul className="rows">
          {categories.map((category, index) => (
            <li key={category.id} className="row">
              <div className="row__main">
                <input
                  type="text"
                  className="row__input"
                  aria-label="Nombre de la categoría"
                  defaultValue={category.name}
                  onBlur={(e) => rename(category, e.target.value)}
                />
              </div>
              <div className="row__actions">
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Subir ${category.name}`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Bajar ${category.name}`}
                  disabled={index === categories.length - 1}
                  onClick={() => move(index, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="btn btn--danger btn--small"
                  onClick={() => remove(category)}
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
