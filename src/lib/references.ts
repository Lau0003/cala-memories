import { compressImage } from './images'
import { supabase } from './supabase'

/**
 * Fotos de referencia de los clientes. Se guardan en un espacio privado:
 * solo los administradores con sesión pueden verlas.
 */
export async function uploadReferenceImage(file: File): Promise<string> {
  const blob = await compressImage(file)
  const path = `${crypto.randomUUID()}.webp`
  const { error } = await supabase.storage.from('referencias').upload(path, blob, {
    contentType: 'image/webp',
  })
  if (error) throw error
  return path
}

/** Devuelve enlaces temporales (1 hora) para mostrar las fotos privadas. */
export async function referenceUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {}
  const { data } = await supabase.storage.from('referencias').createSignedUrls(paths, 3600)
  const map: Record<string, string> = {}
  for (const item of (data as { path: string | null; signedUrl: string }[] | null) ?? []) {
    if (item.path && item.signedUrl) map[item.path] = item.signedUrl
  }
  return map
}
