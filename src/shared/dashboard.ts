import type { PaymentStatusKey, Product, StudentSummary } from './types'

export type ProjectionMethod = 'pond' | 'prom3' | 'tend'

export interface BirthdayToday { id: string; full_name: string; rut: string; age: number }
export interface BirthdayNext { id: string; full_name: string; rut: string; days: number; date: string; weekday: number; turning: number }

export interface ProjectionPoint {
  month: string
  income: number
  expenses: number
  profit: number
  is_current: boolean
  is_projection: boolean
}

export interface Projection {
  method: ProjectionMethod
  next_month: string
  expected_income: number
  expected_profit: number
  expected_expenses: number
  current_income: number
  expenses_registered: boolean
  month_expenses: number
  month_profit: number
  receivable: number
  day: number
  days_in_month: number
  scenarios: { name: string; income: number; expenses: number; profit: number }[]
  break_even: number | null
  history_months: number
  low_history: boolean
  no_past_expenses: boolean
  series: ProjectionPoint[]
}

export interface DashboardData {
  today: string
  months: string[]
  current: string
  previous: string
  active_students: number
  total_students: number
  ticket: number
  membership: Record<string, number>
  product_sales: Record<string, number>
  product_cost: Record<string, number>
  profit: Record<string, number>
  payments_count: Record<string, number>
  sales_count: Record<string, number>
  new_students: Record<string, number>
  expenses: Record<string, number>
  expenses_by_category: Record<string, number>
  expenses_by_category_month: Record<string, Record<string, number>>
  status_distribution: Record<PaymentStatusKey, number>
  active_by_category: Record<string, number>
  product_units: Record<string, number>
  income_by_method: Record<string, number>
  pending: StudentSummary[]
  low_stock: Product[]
  inventory_value: number
  birthdays_today: BirthdayToday[]
  birthdays_next: BirthdayNext[]
  projection: Projection | null
}
