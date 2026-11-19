import { z } from 'zod'
import type { PaymentsRepository } from '../payments/payments.repository'
import type { SalesRepository } from '../sales/sales.repository'
import { env } from '@/server/config/env'
import { todayIso } from '@/shared/dates'
import { planLabel } from '@/shared/domain/payments'
import type { CashClosing, CashEntry, CashMethodTotal } from '@/shared/cashier'

export const cashClosingQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida').optional().or(z.literal('').transform(() => undefined)),
})
export type CashClosingQuery = z.infer<typeof cashClosingQuerySchema>

/**
 * Cierre de caja: todo lo cobrado en el día, sin importar desde dónde se registró
 * (pestaña «Pago alumnos», ficha del alumno o venta de productos).
 * Una venta cuenta el día en que se COBRA (`paid_on`), no el día en que se dejó por cobrar.
 */
export class CashierService {
  constructor(
    private readonly payments: PaymentsRepository,
    private readonly sales: SalesRepository,
  ) {}

  async closing(q: CashClosingQuery): Promise<CashClosing> {
    const date = q.date ?? todayIso(env().APP_TIMEZONE)
    const [pays, sales, pending] = await Promise.all([
      this.payments.listPaidOn(date),
      this.sales.list({ paid_on: date, status: 'completed' }),
      this.sales.list({ status: 'pending' }),
    ])

    const entries: CashEntry[] = [
      ...pays.map((p): CashEntry => ({
        kind: 'membership',
        ref: planLabel(p),
        description: `Mensualidad · ${planLabel(p)}`,
        person: p.student ? `${p.student.first_names} ${p.student.last_names}`.trim() : '—',
        payment_method: p.payment_method,
        amount: p.amount,
      })),
      ...[...sales].sort((a, b) => a.sale_number - b.sale_number).map((v): CashEntry => ({
        kind: 'sale',
        ref: `#${v.sale_number}`,
        description: v.items.map((i) => `${i.quantity > 1 ? `${i.quantity}× ` : ''}${i.product_name}`).join(', '),
        person: v.student_name || 'Cliente general',
        payment_method: v.payment_method,
        amount: v.total,
      })),
    ]

    const byMethod = new Map<string, CashMethodTotal>()
    for (const e of entries) {
      const m = byMethod.get(e.payment_method) ?? { payment_method: e.payment_method, count: 0, amount: 0 }
      m.count++
      m.amount += e.amount
      byMethod.set(e.payment_method, m)
    }
    const sum = (k: CashEntry['kind']) => entries.filter((e) => e.kind === k).reduce((s, e) => s + e.amount, 0)

    return {
      date,
      total: entries.reduce((s, e) => s + e.amount, 0),
      count: entries.length,
      memberships_total: sum('membership'),
      sales_total: sum('sale'),
      by_method: [...byMethod.values()],
      entries,
      pending_count: pending.length,
      pending_total: pending.reduce((s, v) => s + v.total, 0),
    }
  }
}
