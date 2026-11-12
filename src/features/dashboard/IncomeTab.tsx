'use client'

import { Empty, Kpi } from '@/components/gym/ui'
import { BarChart, HBars, tipMoney, type BarPoint } from '@/components/gym/charts'
import { Delta, pct } from './shared'
import { money, monthLabel, monthLong, num } from '@/shared/format'
import type { DashboardData } from '@/shared/dashboard'

export function IncomeTab({ D }: { D: DashboardData }) {
  const c = D.current
  const p = D.previous
  const income = (m: string) => D.membership[m] + D.product_sales[m]
  const noData = D.months.every((m) => income(m) === 0 && D.profit[m] === 0)

  const points: BarPoint[] = D.months.map((m) => ({
    label: monthLabel(m),
    values: [D.membership[m], D.product_sales[m]],
    tip: tipMoney(monthLong(m), [['Membresías', D.membership[m]], ['Ventas', D.product_sales[m]]], ['Total', income(m)]),
  }))

  const compare: [string, number, number, boolean][] = [
    ['Ingresos totales', income(c), income(p), false],
    ['Membresías', D.membership[c], D.membership[p], false],
    ['Ventas de productos', D.product_sales[c], D.product_sales[p], false],
    ['Pagos de membresía (n°)', D.payments_count[c], D.payments_count[p], true],
    ['Ventas realizadas (n°)', D.sales_count[c], D.sales_count[p], true],
  ]

  return (
    <>
      <div className="kpis">
        <Kpi label="Ingresos del mes" value={money(income(c))} sub={<Delta a={income(c)} b={income(p)} prev={p} />} />
        <Kpi label="Pagos de membresía del mes" value={num(D.payments_count[c])} sub={<Delta a={D.payments_count[c]} b={D.payments_count[p]} prev={p} />} />
        <Kpi label="Membresías del mes" value={money(D.membership[c])} sub={<Delta a={D.membership[c]} b={D.membership[p]} prev={p} />} />
        <Kpi label="Ventas de productos del mes" value={money(D.product_sales[c])} sub={<Delta a={D.product_sales[c]} b={D.product_sales[p]} prev={p} />} />
      </div>

      <div className="grid2">
        <div className="card">
          <h2>Ingresos por mes</h2>
          <p className="sub">Membresías + ventas de productos</p>
          <div className="legend">
            <span><i style={{ background: 'var(--c1)' }} />Membresías</span>
            <span><i style={{ background: 'var(--c2)' }} />Ventas de productos</span>
          </div>
          {noData ? <Empty>Aún no hay movimientos en este período</Empty> : <BarChart points={points} colors={['var(--c1)', 'var(--c2)']} stacked label="Ingresos por mes" />}
        </div>
        <div className="card">
          <h2>Ingresos por tipo de pago</h2>
          <p className="sub">Membresías y ventas en el período</p>
          <HBars data={D.income_by_method} fmt={money} color="var(--c3)" />
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <h2>Comparación mensual</h2>
          <p className="sub">{monthLong(c)} vs {monthLong(p)}</p>
          <div className="tw">
            <table style={{ minWidth: 0 }}>
              <thead><tr><th>Indicador</th><th className="r">Actual</th><th className="r">Anterior</th><th className="r">Var.</th></tr></thead>
              <tbody>
                {compare.map(([label, a, b, isCount]) => {
                  const pc = pct(a, b)
                  return (
                    <tr key={label}>
                      <td>{label}</td>
                      <td className="r b">{isCount ? num(a) : money(a)}</td>
                      <td className="r muted">{isCount ? num(b) : money(b)}</td>
                      <td className={`r delta ${pc > 0 ? 'up' : pc < 0 ? 'down' : ''}`}>{pc > 0 ? '▲' : pc < 0 ? '▼' : ''} {Math.abs(pc).toFixed(0)}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <h2>Inventario con stock bajo</h2>
          <p className="sub">Valor del inventario (a costo): <b>{money(D.inventory_value)}</b></p>
          {D.low_stock.length ? (
            <div className="tw">
              <table style={{ minWidth: 0 }}>
                <tbody>
                  {D.low_stock.slice(0, 6).map((prod) => (
                    <tr key={prod.id}>
                      <td><b>{prod.name}</b><br /><span className="muted sm">{prod.category}</span></td>
                      <td className="r">Stock <b>{prod.stock}</b> / mín. {prod.min_stock}</td>
                      <td>{prod.stock === 0 ? <span className="pill bad">Agotado</span> : <span className="pill warn">Stock bajo</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Empty>Inventario en niveles normales</Empty>}
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <h2>Productos más vendidos</h2>
          <p className="sub">Unidades en el período</p>
          <HBars data={D.product_units} fmt={(v) => `${v} u.`} color="var(--c2)" />
        </div>
      </div>
    </>
  )
}
