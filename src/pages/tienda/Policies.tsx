import { useEffect } from 'react'
import { useSettings } from '../../lib/settings'

export default function Policies() {
  const { settings, loaded } = useSettings()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="container page-pad policies">
      <h1>Políticas</h1>
      {!loaded && <p className="muted">Cargando…</p>}
      {loaded && settings.policies.length === 0 && (
        <p className="muted">Pronto publicaremos aquí nuestras políticas.</p>
      )}
      {settings.policies.map((policy) => (
        <section key={policy.title}>
          <h2>{policy.title}</h2>
          {policy.body.split(/\n{2,}/).map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </section>
      ))}
    </div>
  )
}
