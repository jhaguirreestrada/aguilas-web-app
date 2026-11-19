'use client'

import { useState } from 'react'
import { Printer } from 'lucide-react'
import { qs } from '@/lib/api-client'
import { useFetch } from '@/hooks/useFetch'
import { useSettings } from '@/hooks/useSettings'
import { Field, Kpi, MoneyInput, Pill } from '@/components/gym/ui'
import { fmtDate, money } from '@/shared/format'
import { todayIso } from '@/shared/dates'
import type { CashClosing, CashEntry } from '@/shared/cashier'

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
const KIND_LABEL: Record<CashEntry['kind'], string> = { membership: 'Mensualidad', sale: 'Venta' }

/**
 * Cierre de caja del día: suma los pagos de alumnos (se registren donde se registren) y las ventas cobradas.
 * Los egresos del sistema son mensuales y sin medio de pago, por eso no se descuentan del efectivo esperado.
 */
export default function CashClosingTab({ refreshKey }: { refreshKey: number }) {
  const { data: cfg } = useSettings()
  const [date, setDate] = useState(todayIso())
  const [counted, setCounted] = useState<number | ''>('')
  const { data: c, loading } = useFetch<CashClosing>(`/api/cash-closing${qs({ date, k: refreshKey })}`)

  const by = (re: RegExp) => (c?.by_method ?? []).filter((m) => re.test(m.payment_method)).reduce((s, m) => s + m.amount, 0)
  const cash = by(/efectivo/i)
  const cards = by(/tarjeta/i)
  const transfers = by(/transfer/i)
  const diff = counted === '' ? null : counted - cash
  const methods = Array.from(new Set([...(cfg?.payment_methods ?? []), ...(c?.by_method ?? []).map((m) => m.payment_method)]))

  const print = () => {
    if (!c) return
    const rows = methods.map((m) => { const t = c.by_method.find((x) => x.payment_method === m); return `<tr><td>${esc(m)}</td><td class="n">${t?.count ?? 0}</td><td class="n">${money(t?.amount ?? 0)}</td></tr>` }).join('')
    const detail = c.entries.map((e) => `<tr><td>${KIND_LABEL[e.kind]}</td><td>${esc(e.ref)}</td><td>${esc(e.person)}</td><td>${esc(e.description)}</td><td>${esc(e.payment_method)}</td><td class="n">${money(e.amount)}</td></tr>`).join('')
    const w = window.open('', '_blank', 'width=900,height=700')
    if (!w) return
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Cierre de caja ${esc(c.date)}</title><style>
      body{font:13px system-ui,sans-serif;margin:32px;color:#111}h1{margin:0 0 4px}h2{margin:22px 0 6px;font-size:14px}p.s{color:#555;margin:0 0 16px}
      table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #ddd;padding:6px 8px;text-align:left}th{font-size:11px;text-transform:uppercase;color:#555}.n{text-align:right}
      .sign{display:flex;gap:60px;margin-top:70px}.sign div{flex:1;border-top:1px solid #111;padding-top:6px;text-align:center}</style></head><body>
      <h1>CIERRE DE CAJA</h1><p class="s">${esc(cfg?.gym_name ?? '')} · ${fmtDate(c.date)}</p>
      <h2>Resumen por medio de pago</h2><table><tr><th>Medio</th><th class="n">Cobros</th><th class="n">Monto</th></tr>${rows}
      <tr><td><b>TOTAL</b></td><td class="n"><b>${c.count}</b></td><td class="n"><b>${money(c.total)}</b></td></tr></table>
      <p>Mensualidades: <b>${money(c.memberships_total)}</b> · Ventas de productos: <b>${money(c.sales_total)}</b></p>
      <p>Efectivo esperado en caja: <b>${money(cash)}</b>${counted === '' ? '' : ` · Contado: <b>${money(counted)}</b> · Diferencia: <b>${money(counted - cash)}</b>`}</p>
      <h2>Detalle</h2><table><tr><th>Tipo</th><th>Ref.</th><th>Alumno / Cliente</th><th>Detalle</th><th>Pago</th><th class="n">Monto</th></tr>${detail}</table>
      <div class="sign"><div>Responsable de caja</div><div>Administración</div></div></body></html>`)
    w.document.close(); w.focus(); w.print()
  }

  return (
    <div className="card">
      <div className="toolbar">
        <div style={{ maxWidth: 200 }}><Field label="Fecha de cierre"><input type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value || todayIso())} /></Field></div>
        <div className="fx"><button className="btn secondary" onClick={print} disabled={!c}><Printer /> Imprimir cierre</button></div>
      </div>

      {!c ? <div className="empty">{loading ? 'Cargando…' : 'No se pudo cargar el cierre'}</div> : (
        <>
          <div className="kpis">
            <div className="kpi kc main k-term"><span>Total cobrado</span><b>{money(c.total)}</b><small>{c.count} cobro(s) · mensualidades {money(c.memberships_total)} · ventas {money(c.sales_total)}</small></div>
            <Kpi label="Efectivo esperado en caja" value={money(cash)} sub="Efectivo cobrado en el día" />
            <Kpi label="Tarjetas (a conciliar)" value={money(cards)} sub="Débito + crédito: debe coincidir con la máquina" />
            <Kpi label="Transferencias" value={money(transfers)} sub="Revisar en cartola" />
          </div>
          {c.pending_count > 0 && <p className="muted sm" style={{ marginBottom: 12 }}>Hay {c.pending_count} venta(s) por cobrar por {money(c.pending_total)}; no se incluyen hasta que se cobren.</p>}

          <div className="tw">
            <table style={{ minWidth: 0 }}>
              <thead><tr><th>Medio de pago</th><th className="r">Cobros</th><th className="r">Monto</th></tr></thead>
              <tbody>
                {methods.map((m) => { const t = c.by_method.find((x) => x.payment_method === m); return <tr key={m}><td>{m}</td><td className="r">{t?.count ?? 0}</td><td className="r b">{money(t?.amount ?? 0)}</td></tr> })}
                <tr className="tot-row"><td>Total</td><td className="r">{c.count}</td><td className="r">{money(c.total)}</td></tr>
              </tbody>
            </table>
          </div>

          <div className="fg" style={{ marginTop: 16 }}>
            <Field label="Efectivo contado en caja ($)"><MoneyInput placeholder="Ingresa el conteo" value={counted} onChange={setCounted} /></Field>
            <div className="hl" style={{ display: 'flex', alignItems: 'center' }}>
              <div>
                <span className="muted sm">Diferencia</span>
                <div className="b" style={{ fontSize: 20, color: diff == null || diff === 0 ? undefined : 'hsl(var(--destructive))' }}>
                  {diff == null ? '—' : `${diff === 0 ? 'Cuadra ✔ ' : ''}${diff > 0 ? '+' : ''}${money(diff)}`}
                </div>
              </div>
            </div>
          </div>

          <div className="sect-title">Detalle del día</div>
          <div className="tw">
            <table>
              <thead><tr><th>Tipo</th><th>Ref.</th><th>Alumno / Cliente</th><th>Detalle</th><th>Pago</th><th className="r">Monto</th></tr></thead>
              <tbody>
                {c.entries.length ? c.entries.map((e, i) => (
                  <tr key={i}>
                    <td><Pill tone={e.kind === 'membership' ? 'info' : 'ok'}>{KIND_LABEL[e.kind]}</Pill></td>
                    <td>{e.ref}</td><td>{e.person}</td><td>{e.description}</td><td>{e.payment_method}</td><td className="r b">{money(e.amount)}</td>
                  </tr>
                )) : <tr><td colSpan={6} className="empty">Sin cobros este día</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
