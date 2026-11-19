/** Contratos del cierre de caja (servidor ⇄ cliente). */
export interface CashEntry {
  kind: 'membership' | 'sale'
  /** Mensualidad: plan · Venta: N° de venta */
  ref: string
  description: string
  person: string
  payment_method: string
  amount: number
}

export interface CashMethodTotal { payment_method: string; count: number; amount: number }

export interface CashClosing {
  date: string
  total: number
  count: number
  memberships_total: number
  sales_total: number
  by_method: CashMethodTotal[]
  entries: CashEntry[]
  /** Ventas que siguen por cobrar a la fecha (informativo). */
  pending_count: number
  pending_total: number
}
