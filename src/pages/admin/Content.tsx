import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { adminName, useAdmins } from '../../lib/admins'
import {
  CONTENT_FORMATS,
  CONTENT_FORMAT_LABELS,
  CONTENT_STATUSES,
  CONTENT_STATUS_LABELS,
  PLATFORMS,
  PLATFORM_LABELS,
  type ContentItem,
  type ContentStatus,
  type Launch,
} from '../../lib/adminTypes'
import { useAuth } from '../../lib/auth'
import { formatDateTime, toLocalInput } from '../../lib/dates'
import { errorText } from '../../lib/format'
import { supabase } from '../../lib/supabase'

interface Draft {
  id: string | null
  title: string
  platforms: string[]
  format: string
  status: ContentStatus
  scheduled_for: string
  launch_id: string
  media_link: string
  notes: string
  assigned_to: string
}

const SINGULAR: Record<ContentStatus, string> = {
  idea: 'Idea',
  pendiente: 'Pendiente',
  programado: 'Programado',
  publicado: 'Publicado',
}

export default function Content() {
  const { userId } = useAuth()
  const admins = useAdmins()
  const [items, setItems] = useState<ContentItem[]>([])
  const [launches, setLaunches] = useState<Pick<Launch, 'id' | 'name'>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)

  const load = useCallback(async () => {
    const [content, launchList] = await Promise.all([
      supabase
        .from('content_items')
        .select('*')
        .order('scheduled_for', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false }),
      supabase.from('launches').select('id, name').order('name'),
    ])
    if (content.error) setError(errorText(content.error))
    setItems((content.data as ContentItem[] | null) ?? [])
    setLaunches((launchList.data as Pick<Launch, 'id' | 'name'>[] | null) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function create(status: ContentStatus = 'idea') {
    setDraft({
      id: null,
      title: '',
      platforms: [],
      format: 'video',
      status,
      scheduled_for: '',
      launch_id: '',
      media_link: '',
      notes: '',
      assigned_to: userId ?? '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function edit(item: ContentItem) {
    setDraft({
      id: item.id,
      title: item.title,
      platforms: item.platforms ?? [],
      format: item.format,
      status: item.status,
      scheduled_for: toLocalInput(item.scheduled_for),
      launch_id: item.launch_id ?? '',
      media_link: item.media_link,
      notes: item.notes,
      assigned_to: item.assigned_to ?? '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function togglePlatform(platform: string) {
    if (!draft) return
    const has = draft.platforms.includes(platform)
    setDraft({
      ...draft,
      platforms: has
        ? draft.platforms.filter((p) => p !== platform)
        : [...draft.platforms, platform],
    })
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!draft) return
    const title = draft.title.trim()
    if (!title) {
      setError('Escribe de qué trata la publicación.')
      return
    }
    if (draft.status === 'programado' && !draft.scheduled_for) {
      setError('Para dejarla programada, elige la fecha y hora.')
      return
    }
    setError(null)
    const payload = {
      title,
      platforms: draft.platforms,
      format: draft.format,
      status: draft.status,
      scheduled_for: draft.scheduled_for ? new Date(draft.scheduled_for).toISOString() : null,
      launch_id: draft.launch_id || null,
      media_link: draft.media_link.trim(),
      notes: draft.notes.trim(),
      assigned_to: draft.assigned_to || null,
    }
    const { error: err } = draft.id
      ? await supabase.from('content_items').update(payload).eq('id', draft.id)
      : await supabase.from('content_items').insert({ ...payload, created_by: userId })
    if (err) {
      setError(`No se pudo guardar: ${errorText(err)}`)
      return
    }
    setDraft(null)
    load()
  }

  async function move(item: ContentItem, status: ContentStatus) {
    const { error: err } = await supabase
      .from('content_items')
      .update({ status })
      .eq('id', item.id)
    if (err) setError(errorText(err))
    load()
  }

  async function remove(item: ContentItem) {
    if (!window.confirm(`¿Eliminar «${item.title}»?`)) return
    const { error: err } = await supabase.from('content_items').delete().eq('id', item.id)
    if (err) setError(errorText(err))
    load()
  }

  return (
    <>
      <header className="admin-head">
        <h1>Contenido</h1>
        {!draft && (
          <button type="button" className="btn btn--dark" onClick={() => create()}>
            Nueva idea
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
          <h2>{draft.id ? 'Editar publicación' : 'Nueva publicación'}</h2>
          <label className="field">
            <span>Idea o título</span>
            <input
              type="text"
              placeholder="Ej. Video del proceso de pintura de un funko"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </label>

          <fieldset className="fieldset">
            <legend>Redes</legend>
            <div className="chips">
              {PLATFORMS.map((platform) => (
                <button
                  key={platform}
                  type="button"
                  className="chip"
                  aria-pressed={draft.platforms.includes(platform)}
                  onClick={() => togglePlatform(platform)}
                >
                  {PLATFORM_LABELS[platform]}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="field-row">
            <label className="field">
              <span>Formato</span>
              <select
                value={draft.format}
                onChange={(e) => setDraft({ ...draft, format: e.target.value })}
              >
                {CONTENT_FORMATS.map((f) => (
                  <option key={f} value={f}>
                    {CONTENT_FORMAT_LABELS[f]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Estado</span>
              <select
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value as ContentStatus })}
              >
                {CONTENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {SINGULAR[s]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>Fecha y hora de publicación</span>
              <input
                type="datetime-local"
                value={draft.scheduled_for}
                onChange={(e) => setDraft({ ...draft, scheduled_for: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Responsable</span>
              <select
                value={draft.assigned_to}
                onChange={(e) => setDraft({ ...draft, assigned_to: e.target.value })}
              >
                <option value="">Sin asignar</option>
                {admins.map((a) => (
                  <option key={a.user_id} value={a.user_id}>
                    {a.display_name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>Lanzamiento relacionado</span>
              <select
                value={draft.launch_id}
                onChange={(e) => setDraft({ ...draft, launch_id: e.target.value })}
              >
                <option value="">Ninguno</option>
                {launches.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Enlace al material</span>
              <input
                type="url"
                placeholder="https://…"
                value={draft.media_link}
                onChange={(e) => setDraft({ ...draft, media_link: e.target.value })}
              />
            </label>
          </div>

          <label className="field">
            <span>Notas</span>
            <textarea
              rows={3}
              placeholder="Guion, tomas, música, texto de la publicación…"
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            />
          </label>

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

      {!loading && (
        <div className="board">
          {CONTENT_STATUSES.map((status) => {
            const column = items.filter((i) => i.status === status)
            return (
              <section key={status} className="board__col">
                <header className="board__head">
                  <h2>{CONTENT_STATUS_LABELS[status]}</h2>
                  <span className="muted">{column.length}</span>
                </header>

                {column.length === 0 && <p className="board__empty">Nada por ahora.</p>}

                {column.map((item) => (
                  <article key={item.id} className="tile tile--small">
                    <h3>{item.title}</h3>
                    <p className="tile__meta">
                      {CONTENT_FORMAT_LABELS[item.format] ?? item.format}
                      {item.platforms?.length > 0 &&
                        `, ${item.platforms.map((p) => PLATFORM_LABELS[p] ?? p).join(', ')}`}
                    </p>
                    {item.scheduled_for && (
                      <p className="tile__date">{formatDateTime(item.scheduled_for)}</p>
                    )}
                    <p className="tile__meta">{adminName(admins, item.assigned_to)}</p>
                    {item.media_link && (
                      <a
                        className="inline-link"
                        href={item.media_link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Abrir material
                      </a>
                    )}
                    <footer className="tile__foot">
                      <select
                        aria-label={`Mover ${item.title}`}
                        value={item.status}
                        onChange={(e) => move(item, e.target.value as ContentStatus)}
                      >
                        {CONTENT_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {SINGULAR[s]}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn btn--ghost btn--small"
                        onClick={() => edit(item)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Eliminar ${item.title}`}
                        onClick={() => remove(item)}
                      >
                        ×
                      </button>
                    </footer>
                  </article>
                ))}

                <button type="button" className="board__add" onClick={() => create(status)}>
                  + Agregar
                </button>
              </section>
            )
          })}
        </div>
      )}
    </>
  )
}
