import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Falso mientras no exista el archivo .env con los datos de Supabase. */
export const isConfigured = Boolean(url && key && !url.includes('TU-PROYECTO'))

export const supabase = createClient(
  isConfigured ? url! : 'https://sin-configurar.supabase.co',
  isConfigured ? key! : 'sin-configurar',
)
