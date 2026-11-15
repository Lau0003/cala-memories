export type ProductKind = 'estandar' | 'estandar_personalizado' | 'personalizado'

export interface PaymentMethod {
  label: string // ej. "Bancolombia Ahorros", "Nequi", "Llave Bre-B"
  value: string // número o llave
  holder: string // titular
}

export interface Policy {
  title: string
  body: string
}

export interface SiteSettings {
  id: number
  whatsapp_number: string
  hero_title: string
  hero_subtitle: string
  production_min_days: number
  production_max_days: number
  shipping_note: string
  payment_methods: PaymentMethod[]
  policies: Policy[]
  instagram_url: string
  facebook_url: string
  tiktok_url: string
}

export interface Category {
  id: string
  name: string
  slug: string
  sort_order: number
}

/** Lo que ve el público de un producto. */
export interface PublicProduct {
  id: string
  name: string
  slug: string
  short_description: string
  description: string
  price: number
  price_is_from: boolean
  kind: ProductKind
  is_combo: boolean
  includes: string[]
  variants: string[]
  images: string[]
  category_id: string | null
  published: boolean
  featured: boolean
  sort_order: number
  production_min_days: number | null
  production_max_days: number | null
  requires_reference_photo: boolean
}

/** Producto completo, como lo ve el panel. */
export interface Product extends PublicProduct {
  requires_address: boolean
  requires_email: boolean
  production_steps: string[]
  internal_notes: string
  created_at: string
  updated_at: string
}

export interface Admin {
  user_id: string
  display_name: string
}

/** Columnas que el público tiene permiso de leer (ver supabase/schema.sql). */
export const PUBLIC_PRODUCT_COLUMNS =
  'id, name, slug, short_description, description, price, price_is_from, kind, is_combo, includes, variants, images, category_id, published, featured, sort_order, production_min_days, production_max_days, requires_reference_photo'

export const KIND_LABELS: Record<ProductKind, string> = {
  estandar: 'Estándar',
  estandar_personalizado: 'Estándar personalizado',
  personalizado: '100 % personalizado',
}

export const KIND_HELP: Record<ProductKind, string> = {
  estandar: 'Se fabrica igual para todos. Ej: llaveros, kits.',
  estandar_personalizado: 'Mismo tipo de producto, hecho a partir de una foto. Ej: funkos, estatuas de mascotas.',
  personalizado: 'Diseño único para ese cliente. Se cotiza cada vez.',
}

export const DEFAULT_SETTINGS: SiteSettings = {
  id: 1,
  whatsapp_number: '',
  hero_title: 'Recuerdos que se pueden tocar',
  hero_subtitle:
    'Figuras personalizadas, llaveros y regalos impresos en 3D. Los hacemos por encargo y te los llevamos a domicilio.',
  production_min_days: 2,
  production_max_days: 5,
  shipping_note: 'Envío a domicilio en el Valle de Aburrá. El valor del envío se cobra aparte.',
  payment_methods: [],
  policies: [],
  instagram_url: '',
  facebook_url: '',
  tiktok_url: '',
}
