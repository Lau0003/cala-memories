import type { ProductKind } from './types'

/* ---------- Órdenes ---------- */

export type OrderStatus =
  | 'nueva'
  | 'confirmada'
  | 'en_produccion'
  | 'lista'
  | 'entregada'
  | 'cancelada'

export const ORDER_STATUSES: OrderStatus[] = [
  'nueva',
  'confirmada',
  'en_produccion',
  'lista',
  'entregada',
  'cancelada',
]

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  nueva: 'Nueva',
  confirmada: 'Confirmada',
  en_produccion: 'En producción',
  lista: 'Lista',
  entregada: 'Entregada',
  cancelada: 'Cancelada',
}

export interface Order {
  id: string
  order_number: number
  product_id: string | null
  product_name: string
  kind: ProductKind
  variant: string
  quantity: number
  customer_name: string
  customer_phone: string
  customer_email: string
  address: string
  city: string
  notes: string
  reference_images: string[]
  total_price: number
  shipping_fee: number
  paid: boolean
  paid_at: string | null
  payment_method: string
  produce_without_payment: boolean
  status: OrderStatus
  assigned_to: string | null
  due_date: string | null
  delivered_at: string | null
  created_by: string | null
  created_at: string
}

export interface OrderStep {
  id: string
  order_id: string
  position: number
  name: string
  done: boolean
  done_at: string | null
  done_by: string | null
}

export interface OrderEvent {
  id: string
  order_id: string
  note: string
  created_by: string | null
  created_at: string
}

/* ---------- Tareas ---------- */

export interface Task {
  id: string
  title: string
  details: string
  assigned_to: string | null
  due_date: string | null
  done: boolean
  done_at: string | null
  created_at: string
}

/* ---------- Inventario ---------- */

export type SupplyType = 'filamento' | 'pintura' | 'embalaje' | 'otro'
export type SupplyUnit = 'g' | 'ml' | 'unidad'

export const SUPPLY_TYPE_LABELS: Record<SupplyType, string> = {
  filamento: 'Filamento',
  pintura: 'Pintura',
  embalaje: 'Embalaje',
  otro: 'Otro',
}

export interface Supply {
  id: string
  name: string
  type: SupplyType
  color: string
  unit: SupplyUnit
  stock_qty: number
  avg_unit_cost: number
  active: boolean
}

export interface SupplyMovement {
  id: string
  supply_id: string
  order_id: string | null
  qty: number
  reason: string
  created_at: string
}

/* ---------- Cotizador ---------- */

export interface CostSettings {
  labor_rate: number
  kwh_price: number
  printer_watts: number
  wear_pct: number
  waste_pct: number
  packaging_fee: number
}

export interface QuoteMaterial {
  supply_id: string
  name: string
  unit_cost: number
  qty: number
}

export interface QuoteInputs {
  materials: QuoteMaterial[]
  print_hours: number
  labor_hours: number
  extras: number
  include_packaging: boolean
}

export interface Quote {
  id: string
  title: string
  product_id: string | null
  inputs: QuoteInputs
  cost_total: number
  suggested_price: number
  final_price: number
  created_at: string
}

/* ---------- Lanzamientos y contenido ---------- */

export type LaunchStatus = 'idea' | 'en_desarrollo' | 'listo' | 'lanzado'

export const LAUNCH_STATUS_LABELS: Record<LaunchStatus, string> = {
  idea: 'Idea',
  en_desarrollo: 'En desarrollo',
  listo: 'Listo para lanzar',
  lanzado: 'Lanzado',
}

export interface MediaLink {
  label: string
  url: string
}

export interface Launch {
  id: string
  name: string
  description: string
  target_date: string | null
  status: LaunchStatus
  media_links: MediaLink[]
  created_at: string
}

export type ContentStatus = 'idea' | 'pendiente' | 'programado' | 'publicado'

export const CONTENT_STATUSES: ContentStatus[] = ['idea', 'pendiente', 'programado', 'publicado']

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  idea: 'Ideas',
  pendiente: 'Pendientes',
  programado: 'Programados',
  publicado: 'Publicados',
}

export const PLATFORMS = ['instagram', 'tiktok', 'facebook'] as const
export const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
}

export const CONTENT_FORMATS = ['video', 'short', 'publicacion', 'historia'] as const
export const CONTENT_FORMAT_LABELS: Record<string, string> = {
  video: 'Video',
  short: 'Short / Reel',
  publicacion: 'Publicación',
  historia: 'Historia',
}

export interface ContentItem {
  id: string
  title: string
  platforms: string[]
  format: string
  status: ContentStatus
  scheduled_for: string | null
  launch_id: string | null
  media_link: string
  notes: string
  assigned_to: string | null
  created_at: string
}
