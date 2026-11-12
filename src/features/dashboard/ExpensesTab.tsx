'use client'

import { Empty, Kpi } from '@/components/gym/ui'
import { BarChart, Donut, HBars, tipMoney, type BarPoint } from '@/components/gym/charts'
import { Delta, pct } from './shared'
import { compact, money, monthLabel, monthLong } from '@/shared/format'
import type { DashboardData } from '@/shared/dashboard'

export function ExpensesTab({ D }: { D: DashboardData }) {
  const c = D.current
  const p = D.previous
  const income = (m: string) => D.membership[m] + D.product_sales[m]
  const total = Object.values(D.expenses).reduce((s, v) => s + v, 0)
  const avg = D.months.length ? total / D.months.length : 0
  const ranking = Object.entries(D.expenses_by_category).sort((a, b) => b[1] - a[1])
  const none = total === 0

  const expensePoints: BarPoint[] = D.months.map((m) => ({
    label: monthLabel(m), values: [D.expenses[m]], tip: tipMoney(monthLong(m), [['Egresos', D.expenses[m]]]),
  }))
  const vsPoints: BarPoint[] = D.months.map((m) => ({
    label: monthLabel(m), values: [income(m), D.expenses[m]], tip: tipMoney(monthLong(m), [['Ingresos', income(m)], ['Egresos', D.expenses[m]]]),
  }))

  const palette = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--muted-foreground))']
  const slices = ranking.slice(0, 5).map(([label, value], i) => ({ label, value, color: palette[i] }))
  const rest = ranking.slice(5).reduce((s, x) => s + x[1], 0)
  if (rest) slices.push({ label: 'Otros', value: rest, color: palette[5] })

  const byMonth = D.expenses_by_category_month
  const cats = [...new Set([...Object.keys(byMonth[c] ?? {}), ...Object.keys(byMonth[p] ?? {})])]
    .sort((a, b) => (byMonth[c]?.[b] ?? 0) - (byMonth[c]?.[a] ?? 0))

  const incomeTotal = D.months.reduce((s, m) => s + income(m), 0)
  const registered = D.months.filter((m) => D.expenses[m] > 0)
  const maxMonth = D.months.reduce((a, m) => (D.expenses[m] > D.expenses[a] ? m : a), D.months[0])

  return (
    <>
      <div className="kpis">
        <Kpi label="Egresos del mes" value={money(D.expenses[c])} sub={<Delta a={D.expenses[c]} b={D.expenses[p]} prev={p} inverse />} />
        <Kpi label="Promedio mensual" value={money(avg)} sub={`Últimos ${D.months.length} meses`} />
        <Kpi label="Egresos del período" value={money(total)} sub={`Últimos ${D.months.length} meses`} />
        <Kpi
          label="Mayor gasto del período"
          value={ranking[0] ? ranking[0][0] : '—'}
          sub={ranking[0] ? `${money(ranking[0][1])} · ${total ? ((ranking[0][1] / total) * 100).toFixed(0) : 0}% del total` : 'Sin egresos'}
        />
      </div>

      <div className="grid2">
        <div className="card">
          <h2>Egresos por mes</h2>
          <p className="sub">Total de gastos registrados en Egresos</p>
          {none ? <Empty>Aún no hay egresos registrados en este período</Empty> : <BarChart points={expensePoints} colors={['var(--c2)']} label="Egresos por mes" />}
        </div>
        <div className="card">
          <h2>Ingresos vs egresos</h2>
          <p className="sub">Comparación mensual de entradas y salidas de dinero</p>
          <div className="legend">
            <span><i style={{ background: 'var(--c1)' }} />Ingresos</span>
            <span><i style={{ background: 'var(--c2)' }} />Egresos</span>
          </div>
          {none ? <Empty>Aún no hay egresos registrados en este período</Empty> : <BarChart points={vsPoints} colors={['var(--c1)', 'var(--c2)']} label="Ingresos vs egresos" />}
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <h2>Egresos por tipo</h2>
          <p className="sub">Distribución del gasto en el período</p>
          {none ? <Empty>Sin egresos en el período</Empty> : <Donut slices={slices} center={compact(total)} centerSub="total" pct valueFmt={money} />}
        </div>
        <div className="card">
          <h2>Ranking de gastos</h2>
          <p className="sub">Tipos de egreso con mayor monto en el período</p>
          <HBars data={D.expenses_by_category} fmt={money} color="var(--c2)" limit={8} />
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <h2>Comparación mensual</h2>
          <p className="sub">{monthLong(c)} vs {monthLong(p)}</p>
          <div className="tw">
            <table style={{ minWidth: 0 }}>
              <thead><tr><th>Tipo de egreso</th><th className="r">Actual</th><th className="r">Anterior</th><th className="r">Var.</th></tr></thead>
              <tbody>
                {cats.length ? (
                  <>
                    {cats.map((k) => {
                      const a = byMonth[c]?.[k] ?? 0
                      const b = byMonth[p]?.[k] ?? 0
                      const pc = pct(a, b)
                      return (
                        <tr key={k}>
                          <td>{k}</td><td className="r b">{money(a)}</td><td className="r muted">{money(b)}</td>
                          <td className={`r delta ${pc > 0 ? 'down' : pc < 0 ? 'up' : ''}`}>{pc > 0 ? '▲' : pc < 0 ? '▼' : ''} {Math.abs(pc).toFixed(0)}%</td>
                        </tr>
                      )
                    })}
                    <tr className="tot-row"><td className="b">Total</td><td className="r b">{money(D.expenses[c])}</td><td className="r b">{money(D.expenses[p])}</td><td /></tr>
                  </>
                ) : <tr><td colSpan={4}><Empty>Sin egresos en estos meses</Empty></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <h2>Resumen del período</h2>
          <p className="sub">Egresos frente a ingresos</p>
          <div className="tw">
            <table style={{ minWidth: 0 }}>
              <tbody>
                {([
                  ['Total egresos', money(total)],
                  ['Total ingresos', money(incomeTotal)],
                  ['Egresos como % de ingresos', incomeTotal ? `${((total / incomeTotal) * 100).toFixed(0)}%` : '—'],
                  ['Meses con egresos registrados', `${registered.length} de ${D.months.length}`],
                  ['Mes de mayor gasto', total ? `${monthLong(maxMonth)} · ${money(D.expenses[maxMonth])}` : '—'],
                ] as [string, string][]).map(([l, v]) => <tr key={l}><td>{l}</td><td className="r b">{v}</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
