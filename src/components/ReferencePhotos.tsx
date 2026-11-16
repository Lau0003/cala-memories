import { useEffect, useState, type ChangeEvent } from 'react'
import { errorText } from '../lib/format'
import { referenceUrls, uploadReferenceImage } from '../lib/references'

interface ReferencePhotosProps {
  paths: string[]
  /** Si no se pasa, las fotos solo se muestran (sin subir ni quitar). */
  onChange?: (paths: string[]) => void
}

/** Fotos de referencia del cliente (privadas). */
export default function ReferencePhotos({ paths, onChange }: ReferencePhotosProps) {
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const key = paths.join('|')

  useEffect(() => {
    let active = true
    referenceUrls(paths).then((map) => {
      if (active) setUrls(map)
    })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length === 0 || !onChange) return
    setUploading(true)
    setError(null)
    const added: string[] = []
    try {
      for (const file of files) added.push(await uploadReferenceImage(file))
    } catch (err) {
      setError(`No se pudo subir la foto: ${errorText(err)}`)
    }
    if (added.length > 0) onChange([...paths, ...added])
    setUploading(false)
  }

  return (
    <div className="ref-photos">
      {paths.length === 0 && !onChange && <p className="muted">Esta orden no tiene fotos.</p>}

      {paths.length > 0 && (
        <ul className="ref-photos__grid">
          {paths.map((path, index) => (
            <li key={path}>
              {urls[path] ? (
                <a href={urls[path]} target="_blank" rel="noopener noreferrer">
                  <img src={urls[path]} alt={`Foto de referencia ${index + 1}`} />
                </a>
              ) : (
                <div className="photo-placeholder" aria-hidden="true" />
              )}
              {onChange && (
                <button
                  type="button"
                  aria-label={`Quitar foto ${index + 1}`}
                  onClick={() => onChange(paths.filter((p) => p !== path))}
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {onChange && (
        <label className={`btn btn--ghost btn--small ${uploading ? 'is-disabled' : ''}`}>
          {uploading ? 'Subiendo…' : 'Subir fotos de referencia'}
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            disabled={uploading}
            onChange={handleFiles}
          />
        </label>
      )}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
