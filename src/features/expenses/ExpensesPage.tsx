'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarRange, Download, Pencil, Plus, Undo2 } from 'lucide-react'
import { api, errMsg } from '@/lib/api-client'
import { useFetch } from '@/hooks/useFetch'
import { useSettings } from '@/hooks/useSettings'
import { useNotify } from '@/hooks/useNotify'
import { DataGrid, Field, Kpi, MoneyInput, PageHeader, Tabs, opts, type Col } from '@/components/gym/ui'
import { MONTHS_FULL, MONTHS_SHORT, money } from '@/shared/format'
import type { Expense } from '@/shared/types'

type Tab = 'entry' | 'history'

export default function ExpensesPage() {
  const { data, reload, loading } = useFetch<Expense[]>('/api/expenses')
  const { data: cfg } = useSettings()
  const now = new Date()
  const [tab, setTab] = useState<Tab>('entry')
  const [sel, setSel] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 })

  return (
    <div className="gym">
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[
        { key: 'entry', label: 'Ingreso de gastos', icon: <Plus /> },
        { key: 'history', label: 'Historial', icon: <CalendarRange /> },
      ]} />
      {loading || !cfg ? <div className="empty">Cargando…</div> : tab === 'entry'
        ? <Entry all={data ?? []} categories={cfg.expense_categories} sel={sel} setSel={setSel} onSaved={reload} />
        : <History all={data ?? []} categories={cfg.expense_categories} onEdit={(year, month) => { setSel({ year, month }); setTab('entry') }} onNew={() => setTab('entry')} />}
    </div>
  )
}

/* ------------------------------ Ingreso de gastos ------------------------------ */
interface Draft { amount: number | ''; detail: string }

function Entry({ all, categories, sel, setSel, onSaved }: {
  all: Expense[]; categories: string[]; sel: { year: number; month: number }; setSel: (s: { year: number; month: number }) => void; onSaved: () => void
}) {
  const notify = useNotify()
  const years = useMemo(() => {
    const y = new Date().getFullYear()
    return [...new Set([y - 2, y - 1, y, y + 1, ...all.map((e) => e.year)])].sort((a, b) => b - a)
  }, [all])
  const current = useMemo(() => all.filter((e) => e.year === sel.year && e.month === sel.month), [all, sel])
  const cats = useMemo(() => [...categories, ...current.map((e) => e.category).filter((c) => !categories.includes(c))], [categories, current])

  const [draft, setDraft] = useState<Record<string, Draft>>({})
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const by = Object.fromEntries(current.map((e) => [e.category, e]))
    setDraft(Object.fromEntries(cats.map((c) => [c, { amount: by[c] ? by[c].amount : '', detail: by[c]?.detail ?? '' }])))
    setErr('')
  }, [current, cats])

  const total = Object.values(draft).reduce((s, d) => s + (d.amount || 0), 0)
  const upd = (c: string, p: Partial<Draft>) => setDraft((d) => ({ ...d, [c]: { ...d[c], ...p } }))

  const copyPrev = () => {
    let y = sel.year, m = sel.month - 1
    if (m < 1) { m = 12; y-- }
    const prev = all.filter((e) => e.year === y && e.month === m)
    if (!prev.length) return notify.error(`No hay egresos registrados en ${MONTHS_FULL[m - 1]} ${y}`)
    let n = 0
    const next = { ...draft }
    for (const c of cats) {
      const p = prev.find((e) => e.category === c)
      if (p && (next[c]?.amount === '' || next[c]?.amount === undefined)) { next[c] = { amount: p.amount, detail: p.detail }; n++ }
    }
    setDraft(next)
    n ? notify.ok(`${n} monto(s) copiados desde ${MONTHS_FULL[m - 1]} ${y}`, 'Recuerda guardar.') : notify.warn('No había campos vacíos que completar')
  }

  const save = async () => {
    setBusy(true); setErr('')
    const items = cats.filter((c) => (draft[c]?.amount || 0) > 0).map((c) => ({ category: c, amount: Number(draft[c].amount), detail: draft[c].detail.trim() }))
    try {
      await api.put(`/api/expenses/${sel.year}/${sel.month}`, { items })
      notify.ok(`Egresos de ${MONTHS_FULL[sel.month - 1]} ${sel.year} guardados`)
      onSaved()
    } catch (e) { setErr(errMsg(e)) } finally { setBusy(false) }
  }

  return (
    <>
      <PageHeader title="Ingreso de gastos" subtitle="Registra los egresos del gimnasio por mes y año. Los tipos de egreso se administran en Configuración." />
      <div className="card">
        <div className="toolbar">
          <Field label="Año"><select value={sel.year} onChange={(e) => setSel({ ...sel, year: Number(e.target.value) })}>{opts(years)}</select></Field>
          <Field label="Mes"><select value={sel.month} onChange={(e) => setSel({ ...sel, month: Number(e.target.value) })}>{MONTHS_FULL.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}</select></Field>
          <div className="fx"><button className="btn secondary" onClick={copyPrev} title="Copia los montos del mes anterior a los campos vacíos"><Undo2 /> Copiar mes anterior</button></div>
        </div>
        <div className="tw">
          <table style={{ minWidth: 0 }}>
            <thead><tr><th>Tipo de egreso</th><th className="r">Monto (CLP)</th><th>Detalle / comentario</th></tr></thead>
            <tbody>
              {cats.map((c) => (
                <tr key={c}>
                  <td><b>{c}</b>{categories.includes(c) ? '' : <> <span className="pill">Ya no está en Configuración</span></>}</td>
                  <td className="r"><MoneyInput className="eg-in" maxLength={15} placeholder="0" value={draft[c]?.amount ?? ''} onChange={(v) => upd(c, { amount: v })} /></td>
                  <td><input maxLength={120} placeholder="Opcional" value={draft[c]?.detail ?? ''} onChange={(e) => upd(c, { detail: e.target.value })} /></td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="tot-row"><td className="b">Total del mes</td><td className="r b">{money(total)}</td><td /></tr></tfoot>
          </table>
        </div>
        <p className="err">{err}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button className="btn primary" onClick={save} disabled={busy}><Download /> Guardar {MONTHS_FULL[sel.month - 1]} {sel.year}</button>
        </div>
      </div>
    </>
  )
}

/* ------------------------------ Historial ------------------------------ */
interface Period { key: string; year: number; month: number; t: Record<string, number>; total: number }

function History({ all, categories, onEdit, onNew }: { all: Expense[]; categories: string[]; onEdit: (y: number, m: number) => void; onNew: () => void }) {
  const [year, setYear] = useState('')
  const years = useMemo(() => [...new Set(all.map((e) => e.year))].sort((a, b) => b - a), [all])
  const y = year && years.includes(Number(year)) ? year : ''

  const { rows, used, colTot, tot, max } = useMemo(() => {
    const per: Record<string, Period> = {}
    all.filter((e) => !y || e.year === Number(y)).forEach((e) => {
      const k = `${e.year}-${String(e.month).padStart(2, '0')}`
      const p = (per[k] ||= { key: k, year: e.year, month: e.month, t: {}, total: 0 })
      p.t[e.category] = (p.t[e.category] || 0) + e.amount
      p.total += e.amount
    })
    const rows = Object.values(per).sort((a, b) => b.key.localeCompare(a.key))
    const cats = [...categories]
    all.forEach((e) => { if (!cats.includes(e.category)) cats.push(e.category) })
    const colTot = Object.fromEntries(cats.map((c) => [c, rows.reduce((s, r) => s + (r.t[c] || 0), 0)])) as Record<string, number>
    return { rows, used: cats.filter((c) => colTot[c] > 0), colTot, tot: rows.reduce((s, r) => s + r.total, 0), max: rows.reduce<Period | null>((m, r) => (!m || r.total > m.total ? r : m), null) }
  }, [all, categories, y])

  const cols: Col<Period>[] = [
    { h: 'Período', cell: (r) => <b>{MONTHS_FULL[r.month - 1]} {r.year}</b> },
    ...used.map((c): Col<Period> => ({ h: c, cls: 'r', cell: (r) => (r.t[c] ? money(r.t[c]) : <span className="muted">—</span>) })),
    { h: 'Total', cls: 'r tot-col', cell: (r) => <b>{money(r.total)}</b> },
    { h: 'Acciones', cls: 'c', cell: (r) => <button className="btn secondary sm ico" title="Editar mes" onClick={() => onEdit(r.year, r.month)}><Pencil /></button> },
  ]

  return (
    <>
      <PageHeader title="Historial de egresos" subtitle="Gastos del gimnasio agrupados por mes y año" actions={<button className="btn primary" onClick={onNew}><Plus /> Ingresar gastos</button>} />
      <div className="kpis">
        <Kpi label="Meses registrados" value={rows.length} />
        <Kpi label="Total egresos" value={money(tot)} />
        <Kpi label="Promedio mensual" value={money(rows.length ? tot / rows.length : 0)} />
        <Kpi label="Mes de mayor gasto" value={max ? `${MONTHS_SHORT[max.month - 1]} ${max.year}` : '—'} />
      </div>
      <div className="card">
        <div className="toolbar"><Field label="Año"><select value={y} onChange={(e) => setYear(e.target.value)}><option value="">Todos</option>{opts(years)}</select></Field></div>
        <DataGrid<Period> rows={rows} cols={cols} pageSize={12} resetKey={y + used.join()} empty="Aún no hay egresos registrados"
          foot={<tr className="tot-row"><td className="b">Total {y || 'general'}</td>{used.map((c) => <td key={c} className="r b">{money(colTot[c])}</td>)}<td className="r b">{money(tot)}</td><td /></tr>} />
      </div>
    </>
  )
}
