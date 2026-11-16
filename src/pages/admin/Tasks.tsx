import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { adminName, useAdmins } from '../../lib/admins'
import type { Task } from '../../lib/adminTypes'
import { useAuth } from '../../lib/auth'
import { formatDate, isOverdue } from '../../lib/dates'
import { errorText } from '../../lib/format'
import { supabase } from '../../lib/supabase'

type Filter = 'mias' | 'todas' | 'hechas'

export default function Tasks() {
  const { userId } = useAuth()
  const admins = useAdmins()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('mias')

  const [title, setTitle] = useState('')
  const [assignedTo, setAssignedTo] = useState(userId ?? '')
  const [dueDate, setDueDate] = useState('')

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('tasks')
      .select('*')
      .order('done')
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
    if (err) setError(errorText(err))
    setTasks((data as Task[] | null) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const visible = useMemo(() => {
    if (filter === 'hechas') return tasks.filter((t) => t.done)
    const open = tasks.filter((t) => !t.done)
    return filter === 'mias' ? open.filter((t) => t.assigned_to === userId) : open
  }, [filter, tasks, userId])

  async function handleAdd(event: FormEvent) {
    event.preventDefault()
    const value = title.trim()
    if (!value) return
    setError(null)
    const { error: err } = await supabase.from('tasks').insert({
      title: value,
      assigned_to: assignedTo || null,
      due_date: dueDate || null,
      created_by: userId,
    })
    if (err) {
      setError(`No se pudo crear la tarea: ${errorText(err)}`)
      return
    }
    setTitle('')
    setDueDate('')
    load()
  }

  async function toggle(task: Task) {
    const done = !task.done
    setTasks((list) => list.map((t) => (t.id === task.id ? { ...t, done } : t)))
    const { error: err } = await supabase
      .from('tasks')
      .update({ done, done_at: done ? new Date().toISOString() : null })
      .eq('id', task.id)
    if (err) setError(errorText(err))
    load()
  }

  async function remove(task: Task) {
    if (!window.confirm(`¿Eliminar la tarea «${task.title}»?`)) return
    const { error: err } = await supabase.from('tasks').delete().eq('id', task.id)
    if (err) setError(errorText(err))
    load()
  }

  return (
    <>
      <header className="admin-head">
        <h1>Tareas</h1>
      </header>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <form className="card" onSubmit={handleAdd}>
        <h2>Nueva tarea</h2>
        <label className="field">
          <span>Qué hay que hacer</span>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Responsable</span>
            <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
              <option value="">Sin asignar</option>
              {admins.map((a) => (
                <option key={a.user_id} value={a.user_id}>
                  {a.display_name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Fecha límite (opcional)</span>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
        </div>
        <button type="submit" className="btn btn--dark">
          Agregar tarea
        </button>
      </form>

      <div className="chips filter-bar" role="group" aria-label="Filtrar tareas">
        <button
          type="button"
          className="chip"
          aria-pressed={filter === 'mias'}
          onClick={() => setFilter('mias')}
        >
          Mías
        </button>
        <button
          type="button"
          className="chip"
          aria-pressed={filter === 'todas'}
          onClick={() => setFilter('todas')}
        >
          Pendientes de todos
        </button>
        <button
          type="button"
          className="chip"
          aria-pressed={filter === 'hechas'}
          onClick={() => setFilter('hechas')}
        >
          Hechas
        </button>
      </div>

      {loading && <p className="muted">Cargando…</p>}

      {!loading && visible.length === 0 && (
        <p className="muted">
          {filter === 'hechas' ? 'Aún no hay tareas terminadas.' : 'No hay tareas pendientes aquí.'}
        </p>
      )}

      {visible.length > 0 && (
        <ul className="rows">
          {visible.map((task) => (
            <li key={task.id} className={`row ${task.done ? 'is-done' : ''}`}>
              <label className="row__check">
                <input type="checkbox" checked={task.done} onChange={() => toggle(task)} />
                <span className="sr-only">Marcar «{task.title}» como hecha</span>
              </label>
              <div className="row__main">
                <span className="row__title">{task.title}</span>
                <span className="row__meta">
                  {adminName(admins, task.assigned_to)}
                  {task.due_date && (
                    <>
                      {', para el '}
                      <span className={!task.done && isOverdue(task.due_date) ? 'text-warn' : ''}>
                        {formatDate(task.due_date)}
                      </span>
                    </>
                  )}
                </span>
              </div>
              <div className="row__actions">
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Eliminar ${task.title}`}
                  onClick={() => remove(task)}
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
