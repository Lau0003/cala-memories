import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  LAUNCH_STATUS_LABELS,
  type Launch,
  type LaunchStatus,
  type MediaLink,
} from '../../lib/adminTypes'
import { useAuth } from '../../lib/auth'
import { formatDate } from '../../lib/dates'
import { errorText } from '../../lib/format'
import { supabase } from '../../lib/supabase'

interface Draft {
  id: string | null
  name: string
  description: string
  target_date: string
  status: LaunchStatus
  media_links: MediaLink[]
}

const EMPTY: Draft = {
  id: null,
  name: '',
  description: '',
  target_date: '',
  status: 'idea',
  media_links: [],
}

const STATUSES = Object.keys(LAUNCH_STATUS_LABELS) as LaunchStatus[]

export default function Launches() {
  const { userId } = useAuth()
  const [launches, setLaunches] = useState<Launch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('launches')
      .select('*')
      .order('target_date', { ascending: true, nullsFirst: false })
    if (err) setError(errorText(err))
    setLaunches((data as Launch[] | null) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function edit(launch: Launch) {
    setDraft({
      id: launch.id,
      name: launch.name,
      description: launch.description,
      target_date: launch.target_date ?? '',
      status: launch.status,
      media_links: launch.media_links ?? [],
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function setLink(index: number, patch: Partial<MediaLink>) {
    if (!draft) return
    setDraft({
      ...draft,
      media_links: draft.media_links.map((l, i) => (i === index ? { ...l, ...patch } : l)),
    })
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!draft) return
    const name = draft.name.trim()
    if (!name) {
      setError('Escribe el nombre del lanzamiento.')
      return
    }
    setError(null)
    const payload = {
      name,
      description: draft.description.trim(),
      target_date: draft.target_date || null,
      status: draft.status,
      media_links: draft.media_links
        .map((l) => ({ label: l.label.trim() || 'Material', url: l.url.trim() }))
        .filter((l) => /^https?:\/\//i.test(l.url)),
    }
    const { error: err } = draft.id
      ? await supabase.from('launches').update(payload).eq('id', draft.id)
      : await supabase.from('launches').insert({ ...payload, created_by: userId })
    if (err) {
      setError(`No se pudo guardar: ${errorText(err)}`)
      return
    }
    setDraft(null)
    load()
  }

  async function changeStatus(launch: Launch, status: LaunchStatus) {
    const { error: err } = await supabase.from('launches').update({ status }).eq('id', launch.id)
    if (err) setError(errorText(err))
    load()
  }

  async function remove(launch: Launch) {
    if (!window.confirm(`¿Eliminar «${launch.name}»?`)) return
    const { error: err } = await supabase.from('launches').delete().eq('id', launch.id)
    if (err) setError(errorText(err))
    load()
  }

  return (
    <>
      <header className="admin-head">
        <h1>Lanzamientos</h1>
        {!draft && (
          <button type="button" className="btn btn--dark" onClick={() => setDraft(EMPTY)}>
            Nuevo lanzamiento
          </button>
        )}
      </header>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {draft && (
        <form className="card" onSubmit={handleSubmit}>
          <h2>{draft.id ? 'Editar lanzamiento' : 'Nuevo lanzamiento'}</h2>
          <label className="field">
            <span>Nombre del producto</span>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Descripción</span>
            <textarea
              rows={3}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </label>
          <div className="field-row">
            <label className="field">
              <span>Fecha objetivo</span>
              <input
                type="date"
                value={draft.target_date}
                onChange={(e) => setDraft({ ...draft, target_date: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Estado</span>
              <select
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value as LaunchStatus })}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {LAUNCH_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <h3>Material audiovisual</h3>
          <p className="muted">Enlaces a carpetas de Drive, diseños de Canva, videos, etc.</p>
          {draft.media_links.map((link, index) => (
            <div key={index} className="field-row field-row--link">
              <label className="field">
                <span>Nombre</span>
                <input
                  type="text"
                  placeholder="Ej. Fotos del producto"
                  value={link.label}
                  onChange={(e) => setLink(index, { label: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Enlace</span>
                <input
                  type="url"
                  placeholder="https://…"
                  value={link.url}
                  onChange={(e) => setLink(index, { url: e.target.value })}
                />
              </label>
              <button
                type="button"
                className="icon-btn"
                aria-label="Quitar enlace"
                onClick={() =>
                  setDraft({
                    ...draft,
                    media_links: draft.media_links.filter((_, i) => i !== index),
                  })
                }
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() =>
              setDraft({ ...draft, media_links: [...draft.media_links, { label: '', url: '' }] })
            }
          >
            Agregar enlace
          </button>

          <div className="form-bar__actions form-actions">
            <button type="button" className="btn btn--ghost" onClick={() => setDraft(null)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--dark">
              Guardar
            </button>
          </div>
        </form>
      )}

      {loading && <p className="muted">Cargando…</p>}

      {!loading && launches.length === 0 && !draft && (
        <div className="card empty">
          <h2>Aún no hay lanzamientos</h2>
          <p className="muted">
            Anota aquí los productos que vienen, con su fecha y el material para promocionarlos.
          </p>
        </div>
      )}

      {launches.length > 0 && (
        <div className="card-grid">
          {launches.map((launch) => (
            <article key={launch.id} className="tile">
              <header className="tile__head">
                <h2>{launch.name}</h2>
                <span className={`badge badge--launch-${launch.status}`}>
                  {LAUNCH_STATUS_LABELS[launch.status]}
                </span>
              </header>
              <p className="tile__date">{formatDate(launch.target_date)}</p>
              {launch.description && <p className="muted pre">{launch.description}</p>}

              {launch.media_links?.length > 0 && (
                <ul className="tile__links">
                  {launch.media_links.map((link) => (
                    <li key={link.url}>
                      <a href={link.url} target="_blank" rel="noopener noreferrer">
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              )}

              <footer className="tile__foot">
                <select
                  aria-label={`Estado de ${launch.name}`}
                  value={launch.status}
                  onChange={(e) => changeStatus(launch, e.target.value as LaunchStatus)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {LAUNCH_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn--ghost btn--small"
                  onClick={() => edit(launch)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Eliminar ${launch.name}`}
                  onClick={() => remove(launch)}
                >
                  ×
                </button>
              </footer>
            </article>
          ))}
        </div>
      )}
    </>
  )
}
