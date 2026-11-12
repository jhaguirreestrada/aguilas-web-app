'use client'

import { Empty, Kpi } from '@/components/gym/ui'
import { BarChart, LineChart, tipMoney, type BarPoint, type LinePoint } from '@/components/gym/charts'
import { Delta } from './shared'
import { money, monthLabel, monthLong } from '@/shared/format'
import type { DashboardData } from '@/shared/dashboard'

export function ProjectionTab({ D }: { D: DashboardData }) {
  const P = D.projection!
  const c = D.current
  const p = D.previous
  const income = (m: string) => D.membership[m] + D.product_sales[m]
  const prevExpenses = D.expenses[p]

  // ¿Alcanza para pagar los gastos del mes?
  const gap = P.month_expenses - P.current_income
  const potential = P.current_income + P.receivable
  let tone: string
  let title: string
  let text: React.ReactNode
  if (!P.month_expenses) {
    tone = 'muted-foreground'
    title = 'Sin egresos para comparar'
    text = 'Aún no hay egresos cargados ni historial para estimarlos. Regístralos en Egresos para ver si los ingresos alcanzan.'
  } else if (gap <= 0) {
    tone = 'success'
    title = 'Los ingresos ya cubren los gastos del mes'
    text = <>Llevas {money(P.current_income)} frente a {money(P.month_expenses)} de egresos: te sobran <b>{money(-gap)}</b> antes de contar lo que aún está por cobrar.</>
  } else if (potential >= P.month_expenses) {
    tone = 'warning'
    title = 'Aún no alcanza, pero cobrando los pagos pendientes sí'
    text = <>Faltan <b>{money(gap)}</b> para cubrir los egresos. Hay <b>{money(P.receivable)}</b> por cobrar entre alumnos con pago vencido o por vencer.</>
  } else {
    tone = 'destructive'
    title = 'Los ingresos no alcanzan a cubrir los gastos'
    text = <>Faltan <b>{money(gap)}</b>. Aun cobrando todos los pagos pendientes ({money(P.receivable)}) faltarían <b>{money(P.month_expenses - potential)}</b>.</>
  }
  const pc1 = P.month_expenses ? Math.min(100, (P.current_income / P.month_expenses) * 100) : 0
  const pc2 = P.month_expenses ? Math.min(100, (potential / P.month_expenses) * 100) : 0

  const barPoints: BarPoint[] = P.series.map((s) => ({
    label: monthLabel(s.month), values: [s.income, s.expenses], projection: s.is_projection,
    tip: tipMoney(`${monthLong(s.month)}${s.is_projection ? ' · Proyección' : s.is_current ? ' · Mes en curso' : ''}`, [['Ingresos', s.income], ['Egresos', s.expenses]], ['Utilidad', s.profit]),
  }))
  const linePoints: LinePoint[] = P.series.map((s) => ({
    label: monthLabel(s.month), value: s.profit, projection: s.is_projection,
    tip: tipMoney(`${monthLong(s.month)}${s.is_projection ? ' · Proyección' : ''}`, [['Utilidad', s.profit]]),
  }))

  const note = P.history_months < 2
    ? '⚠ Aún hay poco historial (menos de 2 meses completos): la proyección es muy referencial.'
    : P.low_history
      ? '⚠ Hay menos de 3 meses de historial: la proyección mejorará a medida que se acumulen datos.'
      : P.no_past_expenses
        ? '⚠ No hay egresos cargados en meses anteriores: los egresos proyectados quedan en $0.'
        : ''

  const active = D.active_students
  const be = P.break_even

  return (
    <>
      <div className="kpis">
        <Kpi label="Ingresos del mes" value={money(P.current_income)} sub={<Delta a={P.current_income} b={income(p)} prev={p} />} />
        <Kpi label={P.expenses_registered ? 'Egresos del mes' : 'Egresos del mes (estimado)'} value={money(P.month_expenses)} sub={<Delta a={P.month_expenses} b={prevExpenses} prev={p} inverse />} />
        <Kpi label="Utilidad del mes" value={money(P.month_profit)} sub="Ingresos − costo de lo vendido − egresos (sin compras de stock)" />
        <Kpi label="Cobertura de gastos" value={P.month_expenses ? `${Math.round((P.current_income / P.month_expenses) * 100)}%` : '—'} sub="Ingresos a la fecha ÷ egresos del mes" />
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2>¿Cómo va este mes?</h2>
        <p className="sub">{monthLong(c)} · día {P.day} de {P.days_in_month}</p>
        <div style={{ borderLeft: `4px solid hsl(var(--${tone}))`, padding: '4px 0 4px 12px', marginBottom: 14 }}>
          <b>{title}</b>
          <div className="muted" style={{ marginTop: 2 }}>{text}</div>
        </div>
        <div style={{ position: 'relative', height: 14, borderRadius: 7, background: 'hsl(var(--muted))', overflow: 'hidden' }} role="img" aria-label="Ingresos frente a egresos del mes">
          <div style={{ position: 'absolute', inset: '0 auto 0 0', width: `${pc2}%`, background: 'var(--c1)', opacity: 0.3 }} />
          <div style={{ position: 'absolute', inset: '0 auto 0 0', width: `${pc1}%`, background: 'var(--c1)' }} />
        </div>
        <div className="legend" style={{ marginTop: 8 }}>
          <span><i style={{ background: 'var(--c1)' }} />Ingresos a la fecha</span>
          <span><i style={{ background: 'var(--c1)', opacity: 0.3 }} />+ por cobrar</span>
          <span>Meta: egresos del mes (100%)</span>
        </div>
        <div className="kpis" style={{ margin: '12px 0 0' }}>
          <Kpi label="Ingresos a la fecha" value={money(P.current_income)} sub={`Membresías ${money(D.membership[c])} · ventas ${money(D.product_sales[c])}`} />
          <Kpi label={P.expenses_registered ? 'Egresos del mes' : 'Egresos estimados'} value={money(P.month_expenses)} sub={P.expenses_registered ? 'Cargados en Egresos' : 'Aún no cargas los de este mes: se usa el historial'} />
          <Kpi label="Por cobrar" value={money(P.receivable)} sub={`${D.pending.length} alumno(s) con pago vencido o por vencer`} />
          <Kpi label="Esperado según historial" value={money(P.expected_income)} sub="Ingresos típicos de un mes completo" />
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <h2>Ingresos vs egresos</h2>
          <p className="sub">Últimos meses y proyección del mes siguiente</p>
          <div className="legend">
            <span><i style={{ background: 'var(--c1)' }} />Ingresos</span>
            <span><i style={{ background: 'var(--c2)' }} />Egresos</span>
            <span>Barras claras = proyección</span>
          </div>
          <BarChart points={barPoints} colors={['var(--c1)', 'var(--c2)']} label="Ingresos vs egresos con proyección" />
        </div>
        <div className="card">
          <h2>Utilidad mensual</h2>
          <p className="sub">Ingresos − costo de lo vendido − egresos (sin compras de stock). Línea punteada = proyección</p>
          <LineChart points={linePoints} label="Utilidad mensual con proyección" />
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <h2>Proyección para {monthLong(P.next_month)}</h2>
          <p className="sub">Tres escenarios según el método elegido</p>
          <div className="tw">
            <table style={{ minWidth: 0 }}>
              <thead><tr><th>Escenario</th><th className="r">Ingresos</th><th className="r">Egresos</th><th className="r">Utilidad</th></tr></thead>
              <tbody>
                {P.scenarios.map((e) => (
                  <tr key={e.name}>
                    <td>{e.name === 'Esperado' ? <b>Esperado</b> : e.name}</td>
                    <td className="r">{money(e.income)}</td><td className="r">{money(e.expenses)}</td>
                    <td className="r b"><span className={`delta ${e.profit < 0 ? 'down' : 'up'}`}>{money(e.profit)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {note && <p className="sub" style={{ marginTop: 10 }}>{note}</p>}
        </div>
        <div className="card">
          <h2>Punto de equilibrio</h2>
          <p className="sub">Cuántos alumnos necesitas para cubrir los gastos de {monthLong(P.next_month)}</p>
          {be == null ? <Empty>Aún no hay pagos de membresía para calcular el ingreso por alumno</Empty> : (
            <>
              <div className="tw">
                <table style={{ minWidth: 0 }}>
                  <tbody>
                    <tr><td>Egresos esperados</td><td className="r b">{money(P.expected_expenses)}</td></tr>
                    <tr><td>Ingreso mensual promedio por alumno</td><td className="r b">{money(D.ticket)}</td></tr>
                    <tr><td>Alumnos necesarios para cubrir gastos</td><td className="r b">{be}</td></tr>
                    <tr><td>Alumnos activos hoy</td><td className="r b">{active}</td></tr>
                    <tr><td>Holgura</td><td className="r b"><span className={`delta ${active >= be ? 'up' : 'down'}`}>{active >= be ? '+' : ''}{active - be} alumno(s)</span></td></tr>
                  </tbody>
                </table>
              </div>
              <p className="sub" style={{ marginTop: 10 }}>
                {!P.expected_expenses ? 'Sin egresos esperados, no hay gasto que cubrir.' : active >= be ? 'Con los alumnos activos actuales se cubren los gastos esperados, si todos pagan su mensualidad.' : `Faltan ${be - active} alumno(s) activos al día para cubrir los gastos esperados.`}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="card">
        <h2>Cómo se calcula</h2>
        <div className="sub" style={{ lineHeight: 1.6 }}>
          <b>Proyección:</b> usa solo meses completos (no el actual) desde que hay datos. <i>Promedio ponderado</i> da más peso al mes más reciente (3-2-1); <i>promedio simple</i> pondera igual los últimos 3 meses; <i>tendencia lineal</i> extiende la línea de los últimos 6 meses. En egresos se ignoran los meses sin gastos cargados.<br />
          <b>Escenarios:</b> conservador = ingresos −10% y egresos +5%; optimista = ingresos +10% y egresos −5%.<br />
          <b>Por cobrar:</b> suma el último pago de los alumnos activos con pago vencido o por vencer; es un potencial, no un ingreso asegurado.<br />
          <b>Punto de equilibrio:</b> egresos esperados ÷ ingreso mensual promedio por alumno (pagos de los últimos 3 meses, dividido por los meses que cubre cada plan).
        </div>
      </div>
    </>
  )
}
