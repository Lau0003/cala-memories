import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { Admin } from './types'

/** Lista de los administradores, para asignar órdenes, tareas y contenido. */
export function useAdmins(): Admin[] {
  const [admins, setAdmins] = useState<Admin[]>([])

  useEffect(() => {
    let active = true
    supabase
      .from('admins')
      .select('user_id, display_name')
      .order('display_name')
      .then(({ data }: { data: Admin[] | null }) => {
        if (active) setAdmins(data ?? [])
      })
    return () => {
      active = false
    }
  }, [])

  return admins
}

export function adminName(admins: Admin[], userId: string | null): string {
  if (!userId) return 'Sin asignar'
  return admins.find((a) => a.user_id === userId)?.display_name ?? 'Usuario'
}
