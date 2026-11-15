import { useState, type ChangeEvent } from 'react'
import { uploadProductImage } from '../lib/images'
import { errorText } from '../lib/format'

interface ImageManagerProps {
  images: string[]
  onChange: (images: string[]) => void
}

/**
 * Fotos del producto. Se pueden subir (se comprimen solas) o pegar un enlace.
 * La primera foto es la portada.
 */
export default function ImageManager({ images, onChange }: ImageManagerProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [link, setLink] = useState('')

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length === 0) return

    setUploading(true)
    setError(null)
    const added: string[] = []
    try {
      for (const file of files) {
        added.push(await uploadProductImage(file))
      }
    } catch (err) {
      setError(`No se pudo subir la foto: ${errorText(err)}`)
    }
    if (added.length > 0) onChange([...images, ...added])
    setUploading(false)
  }

  function addLink() {
    const value = link.trim()
    if (!value) return
    if (!/^https?:\/\//i.test(value)) {
      setError('El enlace debe empezar por https://')
      return
    }
    setError(null)
    onChange([...images, value])
    setLink('')
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= images.length) return
    const next = [...images]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onChange(next)
  }

  return (
    <div className="image-manager">
      {images.length > 0 && (
        <ul className="image-manager__grid">
          {images.map((src, index) => (
            <li key={src}>
              <img src={src} alt={`Foto ${index + 1}`} />
              {index === 0 && <span className="image-manager__cover">Portada</span>}
              <div className="image-manager__actions">
                <button
                  type="button"
                  aria-label="Mover antes"
                  disabled={index === 0}
                  onClick={() => move(index, index - 1)}
                >
                  ←
                </button>
                <button
                  type="button"
                  aria-label="Mover después"
                  disabled={index === images.length - 1}
                  onClick={() => move(index, index + 1)}
                >
                  →
                </button>
                <button
                  type="button"
                  aria-label="Quitar foto"
                  onClick={() => onChange(images.filter((_, i) => i !== index))}
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <label className={`btn btn--ghost btn--small ${uploading ? 'is-disabled' : ''}`}>
        {uploading ? 'Subiendo…' : 'Subir fotos'}
        <input
          type="file"
          accept="image/*"
          multiple
          hidden
          disabled={uploading}
          onChange={handleFiles}
        />
      </label>

      <div className="chips-input__row">
        <input
          type="url"
          value={link}
          placeholder="O pega el enlace de una imagen (https://…)"
          onChange={(e) => setLink(e.target.value)}
        />
        <button type="button" className="btn btn--ghost btn--small" onClick={addLink}>
          Agregar enlace
        </button>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
