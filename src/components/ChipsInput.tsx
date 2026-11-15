import { useState, type KeyboardEvent } from 'react'

interface ChipsInputProps {
  values: string[]
  onChange: (values: string[]) => void
  placeholder: string
  addLabel?: string
}

/** Lista corta de textos (opciones, contenido de un combo): escribe y presiona Enter. */
export default function ChipsInput({
  values,
  onChange,
  placeholder,
  addLabel = 'Agregar',
}: ChipsInputProps) {
  const [draft, setDraft] = useState('')

  function add() {
    const value = draft.trim()
    if (!value || values.includes(value)) return
    onChange([...values, value])
    setDraft('')
  }

  function handleKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      add()
    }
  }

  return (
    <div className="chips-input">
      {values.length > 0 && (
        <ul className="chips-input__list">
          {values.map((value) => (
            <li key={value}>
              {value}
              <button
                type="button"
                aria-label={`Quitar ${value}`}
                onClick={() => onChange(values.filter((v) => v !== value))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="chips-input__row">
        <input
          type="text"
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
        />
        <button type="button" className="btn btn--ghost btn--small" onClick={add}>
          {addLabel}
        </button>
      </div>
    </div>
  )
}
