import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="container page-pad">
      <h1>No encontramos esta página</h1>
      <p className="muted">El enlace puede estar incompleto o la página ya no existe.</p>
      <Link className="btn btn--dark" to="/">
        Ir al inicio
      </Link>
    </div>
  )
}
