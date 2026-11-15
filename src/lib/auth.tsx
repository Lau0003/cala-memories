import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import type { Admin } from './types'

interface AuthState {
  loading: boolean
  userId: string | null
  /** Fila de la tabla admins. Si es null, la persona no tiene acceso al panel. */
  admin: Admin | null
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [admin, setAdmin] = useState<Admin | null>(null)

  useEffect(() => {
    let active = true

    async function load(uid: string | null) {
      if (!uid) {
        if (active) {
          setUserId(null)
          setAdmin(null)
          setLoading(false)
        }
        return
      }
      const { data } = await supabase
        .from('admins')
        .select('user_id, display_name')
        .eq('user_id', uid)
        .maybeSingle()
      if (active) {
        setUserId(uid)
        setAdmin((data as Admin | null) ?? null)
        setLoading(false)
      }
    }

    supabase.auth.getSession().then(({ data }) => load(data.session?.user.id ?? null))

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // setTimeout evita llamar a Supabase dentro de su propio aviso de sesión
      setTimeout(() => load(session?.user.id ?? null), 0)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  async function signIn(email: string, password: string): Promise<string | null> {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return 'Correo o contraseña incorrectos.'
    return null
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ loading, userId, admin, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
