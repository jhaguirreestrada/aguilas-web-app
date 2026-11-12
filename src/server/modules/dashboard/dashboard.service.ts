import { z } from 'zod'
import type { StudentsService } from '../students/students.service'
import type { PaymentsRepository } from '../payments/payments.repository'
import type { SalesRepository } from '../sales/sales.repository'
import type { ProductsRepository } from '../products/products.repository'
import type { ExpensesRepository } from '../expenses/expenses.service'
import { env } from '@/server/config/env'
import { lastMonths, monthKey, nextMonthKey, pad, parseIso, todayIso } from '@/shared/dates'
import type { BirthdayNext, BirthdayToday, DashboardData, Projection, ProjectionMethod } from '@/shared/dashboard'
import type { PaymentStatusKey } from '@/shared/types'

export const dashboardQuerySchema = z.object({
  months: z.coerce.number().int().refine((n) => n === 6 || n === 12, 'months debe ser 6 o 12').default(6),
  projection: z.enum(['pond', 'prom3', 'tend']).optional().or(z.literal('').transform(() => undefined)),
})
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>

const avg = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0)

/** Pronóstico de una serie mensual: ponderado 3-2-1, promedio simple o tendencia lineal (últimos 6). */
export function forecast(v: number[], method: ProjectionMethod): number {
  if (!v.length) return 0
  const n3 = v.slice(-3)
  if (method === 'prom3') return avg(n3)
  if (method === 'tend' && v.length >= 3) {
    const y = v.slice(-6)
    const n = y.length
    const mx = (n - 1) / 2
    const my = avg(y)
    let sxy = 0
    let sxx = 0
    y.forEach((yy, i) => {
      sxy += (i - mx) * (yy - my)
      sxx += (i - mx) ** 2
    })
    return Math.max(0, my + (sxy / sxx) * (n - mx))
  }
  const w = n3.map((_, i) => i + 1)
  return n3.reduce((s, x, i) => s + x * w[i], 0) / w.reduce((a, b) => a + b, 0)
}

export class DashboardService {
  constructor(
    private readonly students: StudentsService,
    private readonly payments: PaymentsRepository,
    private readonly sales: SalesRepository,
    private readonly products: ProductsRepository,
    private readonly expenses: ExpensesRepository,
  ) {}

  async build(q: DashboardQuery): Promise<DashboardData> {
    const today = todayIso(env().APP_TIMEZONE)
    const months = lastMonths(today, q.months)
    const [al, pg, vt, pr, eg] = await Promise.all([
      this.students.listSummaries(),
      this.payments.listAll(),
      this.sales.list({ from: `${months[0]}-01`, status: 'completed' }),
      this.products.listAll(),
      this.expenses.listAll(),
    ])

    const zero = () => Object.fromEntries(months.map((m) => [m, 0])) as Record<string, number>
    const mem = zero(), ven = zero(), cost = zero(), nPay = zero(), nSales = zero(), fresh = zero(), egr = zero()

    pg.forEach((p) => {
      const k = monthKey(p.paid_on)
      if (k in mem) { mem[k] += p.amount; nPay[k]++ }
    })
    vt.forEach((v) => {
      const k = monthKey(v.sold_on)
      if (k in ven) { ven[k] += v.total; cost[k] += v.cost_total; nSales[k]++ }
    })
    al.forEach((a) => {
      const k = monthKey(a.joined_on || a.created_at.slice(0, 10))
      if (k in fresh) fresh[k]++
    })

    const egrCat: Record<string, number> = {}
    const egrCatMonth: Record<string, Record<string, number>> = {}
    eg.forEach((e) => {
      const k = `${e.year}-${pad(e.month)}`
      if (k in egr) {
        egr[k] += e.amount
        egrCat[e.category] = (egrCat[e.category] || 0) + e.amount
        ;(egrCatMonth[k] ||= {})[e.category] = e.amount
      }
    })

    // Utilidad = membresías + ventas − costo de lo vendido. Las compras de stock (egreso «Productos») no se restan
    // de nuevo: el costo de lo vendido ya está en `cost`.
    const profit = Object.fromEntries(
      months.map((m) => [m, mem[m] + ven[m] - cost[m] + (egrCatMonth[m]?.['Productos'] ?? 0)]),
    ) as Record<string, number>

    const cur = months[months.length - 1]
    const prev = months[months.length - 2]

    // Ingreso mensual promedio por alumno (pagos mensuales de los últimos 3 meses)
    const from3 = months[Math.max(0, months.length - 3)]
    const pg3 = pg.filter((p) => p.unit !== 'days' && monthKey(p.paid_on) >= from3)
    const monthsPaid = pg3.reduce((s, p) => s + (Number(p.months_equivalent) || 1), 0)
    const ticket = monthsPaid ? pg3.reduce((s, p) => s + p.amount, 0) / monthsPaid : 0

    const active = al.filter((a) => a.status === 'Activo')
    const dist: Record<PaymentStatusKey, number> = { CURRENT: 0, DUE_SOON: 0, OVERDUE: 0, NONE: 0 }
    active.forEach((a) => dist[a.payment_status.key]++)
    const byCat: Record<string, number> = {}
    active.forEach((a) => { const c = a.category || 'Sin categoría'; byCat[c] = (byCat[c] || 0) + 1 })

    const units: Record<string, number> = {}
    vt.filter((v) => monthKey(v.sold_on) >= months[0]).forEach((v) =>
      v.items.forEach((i) => { units[i.product_name] = (units[i.product_name] || 0) + i.quantity }))
    const byMethod: Record<string, number> = {}
    pg.filter((p) => monthKey(p.paid_on) >= months[0]).forEach((p) => { byMethod[p.payment_method] = (byMethod[p.payment_method] || 0) + p.amount })
    vt.filter((v) => monthKey(v.sold_on) >= months[0]).forEach((v) => { byMethod[v.payment_method] = (byMethod[v.payment_method] || 0) + v.total })

    const pending = active
      .filter((a) => a.payment_status.key === 'OVERDUE' || a.payment_status.key === 'DUE_SOON')
      .sort((a, b) => (a.last_payment!.due_date).localeCompare(b.last_payment!.due_date))

    const data: DashboardData = {
      today, months, current: cur, previous: prev,
      active_students: active.length, total_students: al.length, ticket,
      membership: mem, product_sales: ven, product_cost: cost, profit,
      payments_count: nPay, sales_count: nSales, new_students: fresh,
      expenses: egr, expenses_by_category: egrCat, expenses_by_category_month: egrCatMonth,
      status_distribution: dist, active_by_category: byCat, product_units: units, income_by_method: byMethod,
      pending,
      low_stock: pr.filter((p) => p.is_active && p.stock <= p.min_stock).sort((a, b) => a.stock - b.stock),
      inventory_value: pr.reduce((s, p) => s + p.stock * p.cost, 0),
      birthdays_today: this.birthdaysToday(active, today),
      birthdays_next: this.birthdaysNext(active, today),
      projection: null,
    }
    if (q.projection) data.projection = this.project(data, q.projection)
    return data
  }

  private birthdaysToday(active: { id: string; full_name: string; rut: string; birth_date: string | null; age: number | null }[], today: string): BirthdayToday[] {
    const t = parseIso(today)
    return active
      .filter((a) => {
        if (!a.birth_date) return false
        const b = parseIso(a.birth_date)
        return b.getDate() === t.getDate() && b.getMonth() === t.getMonth()
      })
      .map((a) => ({ id: a.id, full_name: a.full_name, rut: a.rut, age: a.age ?? 0 }))
  }

  /** Cumpleaños de mañana a +7 días (29/feb en año no bisiesto => 28/feb). */
  private birthdaysNext(active: { id: string; full_name: string; rut: string; birth_date: string | null }[], today: string): BirthdayNext[] {
    const h0 = parseIso(today)
    const out: BirthdayNext[] = []
    for (const a of active) {
      if (!a.birth_date) continue
      const b = parseIso(a.birth_date)
      const on = (y: number) => {
        const f = new Date(y, b.getMonth(), b.getDate())
        return f.getMonth() !== b.getMonth() ? new Date(y, b.getMonth() + 1, 0) : f
      }
      let f = on(h0.getFullYear())
      if (f < h0) f = on(h0.getFullYear() + 1)
      const days = Math.round((f.getTime() - h0.getTime()) / 864e5)
      if (days < 1 || days > 7) continue
      out.push({
        id: a.id, full_name: a.full_name, rut: a.rut, days,
        date: `${f.getFullYear()}-${pad(f.getMonth() + 1)}-${pad(f.getDate())}`,
        weekday: f.getDay(), turning: f.getFullYear() - b.getFullYear(),
      })
    }
    return out.sort((x, y) => x.days - y.days)
  }

  private project(D: DashboardData, method: ProjectionMethod): Projection {
    const income = (m: string) => D.membership[m] + D.product_sales[m]
    const c = D.current
    const hist = D.months.slice(0, -1)
    const i0 = hist.findIndex((m) => income(m) > 0 || D.expenses[m] > 0)
    const hh = i0 < 0 ? [] : hist.slice(i0) // meses completos desde que hay datos
    const sIng = hh.map(income)
    const sProfit = hh.map((m) => D.profit[m])
    const sExp = hh.map((m) => D.expenses[m]).filter((v) => v > 0) // meses sin egresos cargados no cuentan

    const expectedIncome = forecast(sIng, method)
    const expectedProfit = forecast(sProfit, method)
    const expectedExpenses = forecast(sExp, method)

    const currentIncome = income(c)
    const registered = D.expenses[c] > 0
    const monthExpenses = registered ? D.expenses[c] : expectedExpenses
    const receivable = D.pending.reduce((s, a) => s + (a.last_payment?.amount || 0), 0)

    const t = parseIso(D.today)
    const daysInMonth = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate()

    const scenarios = (
      [['Conservador', 0.9, 1.05], ['Esperado', 1, 1], ['Optimista', 1.1, 0.95]] as [string, number, number][]
    ).map(([name, f, g]) => {
      const inc = expectedIncome * f
      const exp = expectedExpenses * g
      return { name, income: inc, expenses: exp, profit: expectedProfit + expectedIncome * (f - 1) - exp }
    })

    const nextMonth = nextMonthKey(c)
    const expOf = (m: string) => (m === c ? monthExpenses : D.expenses[m])
    const series = D.months.slice(-6).map((m) => ({
      month: m, income: income(m), expenses: expOf(m), profit: D.profit[m] - expOf(m),
      is_current: m === c, is_projection: false,
    }))
    series.push({ month: nextMonth, income: scenarios[1].income, expenses: scenarios[1].expenses, profit: scenarios[1].profit, is_current: false, is_projection: true })

    return {
      method, next_month: nextMonth,
      expected_income: expectedIncome, expected_profit: expectedProfit, expected_expenses: expectedExpenses,
      current_income: currentIncome, expenses_registered: registered, month_expenses: monthExpenses,
      month_profit: D.profit[c] - monthExpenses, receivable,
      day: t.getDate(), days_in_month: daysInMonth,
      scenarios,
      break_even: D.ticket > 0 ? Math.ceil(expectedExpenses / D.ticket) : null,
      history_months: hh.length, low_history: hh.length < 3, no_past_expenses: !sExp.length,
      series,
    }
  }
}

