import { useState, type KeyboardEvent } from 'react'

const PRESETS = [
  'Modelado 3D',
  'Laminado',
  'Impresión',
  'Limpieza y lijado',
  'Imprimación',
  'Pintura',
  'Ensamble',
  'Control de calidad',
  'Empaque',
]

interface StepsEditorProps {
  steps: string[]
  onChange: (steps: string[]) => void
}

/**
 * Editor de pasos de producción.
 * - Clic en un paso sugerido para agregarlo.
 * - Arrastra un paso para cambiar el orden (o usa las flechas).
 */
export default function StepsEditor({ steps, onChange }: StepsEditorProps) {
  const [draft, setDraft] = useState('')
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  function add(name: string) {
    const value = name.trim()
    if (!value || steps.includes(value)) return
    onChange([...steps, value])
  }

  function addDraft() {
    add(draft)
    setDraft('')
  }

  function handleKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      addDraft()
    }
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= steps.length || from === to) return
    const next = [...steps]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onChange(next)
  }

  const available = PRESETS.filter((p) => !steps.includes(p))

  return (
    <div className="steps-editor">
      {steps.length === 0 ? (
        <p className="muted">
          Todavía no hay pasos. Agrega los que sigues para fabricar este producto.
        </p>
      ) : (
        <ol className="steps-editor__list">
          {steps.map((step, index) => (
            <li
              key={step}
              draggable
              className={dragIndex === index ? 'is-dragging' : ''}
              onDragStart={(e) => {
                setDragIndex(index)
                e.dataTransfer.effectAllowed = 'move'
              }}
              onDragOver={(e) => {
                e.preventDefault()
                if (dragIndex !== null && dragIndex !== index) {
                  move(dragIndex, index)
                  setDragIndex(index)
                }
              }}
              onDragEnd={() => setDragIndex(null)}
            >
              <span className="steps-editor__grip" aria-hidden="true">
                ⋮⋮
              </span>
              <span className="steps-editor__num">{index + 1}</span>
              <span className="steps-editor__name">{step}</span>
              <span className="steps-editor__actions">
                <button
                  type="button"
                  aria-label={`Subir ${step}`}
                  disabled={index === 0}
                  onClick={() => move(index, index - 1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Bajar ${step}`}
                  disabled={index === steps.length - 1}
                  onClick={() => move(index, index + 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label={`Quitar ${step}`}
                  onClick={() => onChange(steps.filter((_, i) => i !== index))}
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ol>
      )}

      {available.length > 0 && (
        <div className="steps-editor__presets">
          <span className="muted">Agregar con un clic:</span>
          <div className="chips">
            {available.map((preset) => (
              <button key={preset} type="button" className="chip" onClick={() => add(preset)}>
                + {preset}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="chips-input__row">
        <input
          type="text"
          value={draft}
          placeholder="Otro paso, ej. Instalar chip NFC"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
        />
        <button type="button" className="btn btn--ghost btn--small" onClick={addDraft}>
          Agregar paso
        </button>
      </div>
    </div>
  )
}
