import { supabase } from './supabase'

const MAX_SIDE = 1600
const QUALITY = 0.82

/**
 * Reduce la foto antes de subirla (lado mayor de 1600 px, formato WebP).
 * Una foto de celular de 4 MB queda en unos 150-250 KB sin perder calidad visible.
 */
export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('El navegador no pudo procesar la imagen.')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', QUALITY),
  )
  if (!blob) throw new Error('El navegador no pudo comprimir la imagen.')
  return blob
}

/** Sube una foto de producto y devuelve su enlace público. */
export async function uploadProductImage(file: File): Promise<string> {
  const blob = await compressImage(file)
  const path = `${crypto.randomUUID()}.webp`
  const { error } = await supabase.storage.from('productos').upload(path, blob, {
    contentType: 'image/webp',
    cacheControl: '31536000',
  })
  if (error) throw error
  return supabase.storage.from('productos').getPublicUrl(path).data.publicUrl
}
