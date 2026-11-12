/**
 * Contratos de datos compartidos entre servidor y cliente.
 * Los nombres coinciden con las columnas de `boxing_gym` (snake_case).
 */

export type Sex = 'F' | 'M'
export type PlanUnit = 'months' | 'days'

// ---------- Configuración ----------
export interface Plan { name: string; unit: PlanUnit; quantity: number; amount: number }
export interface WeightCategory { name: string; min_kg: number; max_kg: number }
export interface Settings {
  gym_name: string
  warning_days: number
  /** Minutos sin actividad antes de cerrar la sesión */
  inactivity_minutes: number
  whatsapp: { overdue: string; due_soon: string; current: string }
  payment_methods: string[]
  plans: Plan[]
  student_statuses: string[]
  product_categories: string[]
  expense_categories: string[]
  weight_categories_female: WeightCategory[]
  weight_categories_male: WeightCategory[]
}

// ---------- Alumnos y pagos ----------
export interface Student {
  id: string
  first_names: string
  last_names: string
  rut: string
  birth_date: string | null
  sex: Sex | null
  phone: string
  email: string
  weight_kg: number | null
  notes: string
  status: string
  joined_on: string | null
  withdrawal_reason: string
  withdrawn_on: string | null
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  student_id: string
  paid_on: string
  plan_name: string
  unit: PlanUnit
  quantity: number
  months_equivalent: number
  payment_method: string
  amount: number
  due_date: string
  notes: string
  created_at: string
}

export type PaymentStatusKey = 'CURRENT' | 'DUE_SOON' | 'OVERDUE' | 'NONE'
export interface PaymentStatus {
  key: PaymentStatusKey
  label: string
  tone: 'ok' | 'warn' | 'bad' | ''
  days_overdue: number
  days_left: number | null
}

export interface StudentSummary extends Student {
  full_name: string
  category: string
  age: number | null
  last_payment: Payment | null
  payment_status: PaymentStatus
  payments_count: number
}

export interface WeightEntry { id: string; weight_kg: number; recorded_at: string }

// ---------- Productos / ventas ----------
export interface Product {
  id: string
  code: string
  name: string
  category: string
  price: number
  cost: number
  stock: number
  min_stock: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type MovementType = 'initial_stock' | 'purchase' | 'in' | 'out' | 'adjustment' | 'sale' | 'sale_void'
export interface InventoryMovement {
  id: string
  product_id: string
  moved_on: string
  movement_type: MovementType
  quantity: number
  resulting_stock: number
  purchase_price: number | null
  document: string
  reason: string
  created_at: string
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string | null
  product_name: string
  quantity: number
  unit_price: number
  unit_cost: number
  subtotal: number
}
export interface Sale {
  id: string
  sale_number: number
  sold_on: string
  sold_time: string
  total: number
  cost_total: number
  payment_method: string
  student_id: string | null
  student_name: string
  notes: string
  status: 'completed' | 'voided'
  voided_on: string | null
  items: SaleItem[]
}

// ---------- Egresos / planificación ----------
export interface Expense { id: string; year: number; month: number; category: string; amount: number; detail: string }

export type ActivityPriority = 'critical' | 'high' | 'medium' | 'low'
export type ActivityStatus = 'pending' | 'in_progress' | 'done' | 'dropped'
export interface Activity {
  id: string
  name: string
  priority: ActivityPriority
  status: ActivityStatus
  start_date: string
  end_date: string
  notes: string
  closed_on: string | null
}

// ---------- Usuarios / auditoría ----------
export interface AppUser {
  id: string
  username: string
  full_name: string
  email: string | null
  is_active: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGIN_FAILED' | 'LOGOUT' | 'IMPORT' | 'RESET'
export interface AuditLog {
  id: number
  occurred_at: string
  actor_user_id: string | null
  actor_username: string
  action: AuditAction | string
  entity: string
  record_id: string | null
  description: string | null
  changes_before: Record<string, unknown> | null
  changes_after: Record<string, unknown> | null
}
export interface AuditStats { events_today: number; events_month: number; logins_today: number; deletes_today: number }

export interface Paginated<T> { data: T[]; total: number; page: number; limit: number }

export interface SessionUser { id: string; username: string; full_name: string }
