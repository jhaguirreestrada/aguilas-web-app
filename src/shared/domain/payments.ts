import { addDays, addMonths, diffDays } from '../dates'
import type { Payment, PaymentStatus, Plan } from '../types'

/** Vencimiento de un pago: mensual = fecha + N meses; diario = vale N días contando el día de pago. */
export const planDueDate = (paidOn: string, plan: Pick<Plan, 'unit' | 'quantity'>): string =>
  plan.unit === 'days' ? addDays(paidOn, plan.quantity - 1) : addMonths(paidOn, plan.quantity)

export const monthsEquivalent = (plan: Pick<Plan, 'unit' | 'quantity'>): number =>
  plan.unit === 'days' ? plan.quantity / 30 : plan.quantity

/**
 * Último pago = el que más lejos llega (un pase diario no tapa una mensualidad vigente).
 * Desempate por fecha de pago y de creación.
 */
export function lastPayment<T extends Pick<Payment, 'due_date' | 'paid_on' | 'created_at'>>(payments: T[]): T | null {
  const key = (p: T) => `${p.due_date}|${p.paid_on}|${p.created_at}`
  return payments.reduce<T | null>((m, p) => (!m || key(p) > key(m) ? p : m), null)
}

/** Estado de pago (misma regla del Excel original). */
export function paymentStatus(
  last: Pick<Payment, 'due_date'> | null,
  warningDays: number,
  today: string,
): PaymentStatus {
  if (!last) return { key: 'NONE', label: 'Sin pagos', tone: '', days_overdue: 0, days_left: null }
  const due = last.due_date
  if (due < today) return { key: 'OVERDUE', label: 'Vencido', tone: 'bad', days_overdue: diffDays(today, due), days_left: null }
  if (due <= addDays(today, warningDays))
    return { key: 'DUE_SOON', label: 'Por Vencer', tone: 'warn', days_overdue: 0, days_left: diffDays(due, today) }
  return { key: 'CURRENT', label: 'Vigente', tone: 'ok', days_overdue: 0, days_left: diffDays(due, today) }
}

export const durationLabel = (unit: string, qty: number) =>
  unit === 'days' ? (qty === 1 ? '1 día' : `${qty} días`) : qty === 1 ? '1 mes' : `${qty} meses`

export const planLabel = (p: Pick<Payment, 'plan_name' | 'unit' | 'quantity'>) =>
  p.plan_name ? `${p.plan_name} · ${durationLabel(p.unit, p.quantity)}` : durationLabel(p.unit, p.quantity)
