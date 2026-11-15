import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import Logo from '../../components/Logo'
import { useAuth } from '../../lib/auth'

export default function Login() {
  const { loading, userId, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!loading && userId) return <Navigate to="/admin" replace />

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const message = await signIn(email.trim(), password)
    if (message) setError(message)
    setBusy(false)
  }

  return (
    <div className="admin-center">
      <form className="card card--narrow login" onSubmit={handleSubmit}>
        <Logo />
        <h1>Panel de administración</h1>

        <label className="field">
          <span>Correo</span>
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="field">
          <span>Contraseña</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn--dark btn--wide" disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>

        <Link to="/" className="login__back">
          Volver a la tienda
        </Link>
      </form>
    </div>
  )
}
