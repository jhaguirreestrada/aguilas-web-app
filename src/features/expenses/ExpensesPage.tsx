'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarRange, Download, Pencil, Plus, Trash2 } from 'lucide-react'
import { api, errMsg } from '@/lib/api-client'
import { useFetch } from '@/hooks/useFetch'
import { useSettings } from '@/hooks/useSettings'
import { useNotify } from '@/hooks/useNotify'
import { useConfirm } from '@/components/providers/ConfirmProvider'
import { GymModal } from '@/components/gym/GymModal'
import { HBars } from '@/components/gym/charts'
import { DataGrid, Field, Kpi, MoneyInput, PageHeader, Pill, Tabs, opts, type Col } from '@/components/gym/ui'
import { todayIso } from '@/shared/dates'
import { MONTHS_FULL, MONTHS_SHORT, fmtDate, money } from '@/shared/format'
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

/* ------------------------------ Ingreso de gastos (egresos individuales) ------------------------------ */
const downloadCsv = (name: string, head: string[], rows: (string | number)[][]) => {
  const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const csv = '\uFEFF' + [head, ...rows].map((r) => r.map(q).join(';')).join('\r\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

function Entry({ all, sel, setSel, onSaved }: {
  all: Expense[]; categories: string[]; sel: { year: number; month: number }; setSel: (s: { year: number; month: number }) => void; onSaved: () => void
}) {
  const notify = useNotify()
  const confirm = useConfirm()
  const [editing, setEditing] = useState<Expense | null | undefined>(undefined) // undefined = cerrado, null = nuevo
  const years = useMemo(() => {
    const y = new Date().getFullYear()
    return [...new Set([y - 1, y, y + 1, sel.year, ...all.map((e) => e.year)])].sort((a, b) => b - a)
  }, [all, sel.year])
  const rows = useMemo(() => all.filter((e) => e.year === sel.year && e.month === sel.month)
    .sort((a, b) => b.expense_date.localeCompare(a.expense_date)), [all, sel])
  const total = rows.reduce((s, e) => s + e.amount, 0)
  const byCat = useMemo(() => {
    const m: Record<string, number> = {}
    rows.forEach((e) => { m[e.category] = (m[e.category] || 0) + e.amount })
    return m
  }, [rows])

  const remove = async (e: Expense) => {
    const ok = await confirm({ title: 'Eliminar egreso', message: '¿Eliminar este egreso?', okLabel: 'Eliminar', danger: true })
    if (!ok) return
    try { await api.del(`/api/expenses/${e.id}`); notify.ok('Egreso eliminado'); onSaved() } catch (er) { notify.fail(er) }
  }

  const csv = () => downloadCsv(`egresos_${sel.year}-${String(sel.month).padStart(2, '0')}.csv`,
    ['Fecha', 'Categoría', 'Descripción', 'Comentario', 'Pago', 'Monto'],
    rows.map((e) => [e.expense_date, e.category, e.detail, e.comment, e.payment_method, e.amount]))

  return (
    <>
      <PageHeader compact title="Ingreso de gastos" subtitle="Gastos del gimnasio: arriendo, sueldos, insumos, proveedores"
        actions={<button className="btn primary" onClick={() => setEditing(null)}><Plus /> Nuevo egreso</button>} />
      <div className="grid2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="toolbar">
            <Field label="Mes"><select value={sel.month} onChange={(e) => setSel({ ...sel, month: Number(e.target.value) })}>{MONTHS_FULL.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}</select></Field>
            <Field label="Año"><select value={sel.year} onChange={(e) => setSel({ ...sel, year: Number(e.target.value) })}>{opts(years)}</select></Field>
            <div className="fx"><button className="btn secondary" onClick={csv}><Download /> CSV</button></div>
          </div>
          <DataGrid<Expense> rows={rows} pageSize={10} resetKey={`${sel.year}-${sel.month}`} empty="Sin egresos en el mes" cols={[
            { h: 'Fecha', cell: (e) => fmtDate(e.expense_date) },
            { h: 'Categoría', cell: (e) => <Pill tone="info">{e.category}</Pill> },
            { h: 'Descripción', cell: (e) => <>{e.detail}{e.comment ? <><br /><span className="muted sm">{e.comment}</span></> : null}</> },
            { h: 'Pago', cell: (e) => e.payment_method || <span className="muted">—</span> },
            { h: 'Monto', cls: 'r', cell: (e) => <b>{money(e.amount)}</b> },
            { h: '', cls: 'c', cell: (e) => (
              <div className="acts">
                <button className="btn secondary sm ico" title="Editar" onClick={() => setEditing(e)}><Pencil /></button>
                <button className="btn secondary sm ico" title="Eliminar" style={{ color: 'hsl(var(--destructive))' }} onClick={() => remove(e)}><Trash2 /></button>
              </div>
            ) },
          ]} />
        </div>
        <div className="card">
          <h2>Total del mes</h2>
          <div className="kpi" style={{ border: 0, padding: 0 }}><b style={{ fontSize: 30 }}>{money(total)}</b></div>
          <p className="sub">{rows.length} egreso(s)</p>
          {rows.length ? <HBars data={byCat} fmt={money} color="var(--c2)" limit={50} /> : <div className="empty">Sin egresos</div>}
        </div>
      </div>
      {editing !== undefined && <ExpenseModal expense={editing} year={sel.year} month={sel.month} onClose={() => setEditing(undefined)} onSaved={onSaved} />}
    </>
  )
}

function ExpenseModal({ expense, year, month, onClose, onSaved }: { expense: Expense | null; year: number; month: number; onClose: () => void; onSaved: () => void }) {
  const notify = useNotify()
  const { data: cfg } = useSettings()
  const cats = cfg?.expense_categories ?? []
  const methods = cfg?.payment_methods ?? []
  const today = todayIso()
  // Para un egreso nuevo, la fecha por defecto es hoy si está en el mes mostrado; si no, el día 1 de ese mes
  const defDate = today.startsWith(`${year}-${String(month).padStart(2, '0')}`) ? today : `${year}-${String(month).padStart(2, '0')}-01`
  const [d, setD] = useState({
    expense_date: expense?.expense_date ?? defDate,
    category: expense?.category ?? cats[0] ?? '',
    detail: expense?.detail ?? '',
    amount: (expense?.amount ?? '') as number | '',
    payment_method: expense?.payment_method ?? (methods.includes('Transferencia') ? 'Transferencia' : methods[0] ?? ''),
    comment: expense?.comment ?? '',
  })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  // Si la configuración llegó después de abrir el modal, completa los valores por defecto
  useEffect(() => {
    setD((x) => {
      const category = x.category || cats[0] || ''
      const payment_method = x.payment_method || (methods.includes('Transferencia') ? 'Transferencia' : methods[0] ?? '')
      return category === x.category && payment_method === x.payment_method ? x : { ...x, category, payment_method }
    })
  }, [cats, methods])
  const catOpts = expense && !cats.includes(expense.category) ? [...cats, expense.category] : cats
  const payOpts = expense?.payment_method && !methods.includes(expense.payment_method) ? [...methods, expense.payment_method] : methods

  const save = async () => {
    if (!d.expense_date || !d.detail.trim()) return setErr('Fecha y descripción son obligatorias')
    if (!d.amount) return setErr('Indica el monto')
    setBusy(true); setErr('')
    try {
      const body = { ...d, amount: Number(d.amount), detail: d.detail.trim(), comment: d.comment.trim() }
      if (expense) await api.put(`/api/expenses/${expense.id}`, body)
      else await api.post('/api/expenses', body)
      notify.ok('Egreso guardado'); onSaved(); onClose()
    } catch (e) { setErr(errMsg(e)) } finally { setBusy(false) }
  }

  return (
    <GymModal title={expense ? 'Editar egreso' : 'Nuevo egreso'} size="mid" onClose={onClose}
      footer={<><button className="btn secondary" onClick={onClose}>Cancelar</button><button className="btn primary" onClick={save} disabled={busy}>Guardar</button></>}>
      <div className="gym">
        <div className="fg">
          <Field label="Fecha"><input type="date" value={d.expense_date} onChange={(e) => setD({ ...d, expense_date: e.target.value })} /></Field>
          <Field label="Categoría"><select value={d.category} onChange={(e) => setD({ ...d, category: e.target.value })}>{opts(catOpts)}</select></Field>
          <Field label="Descripción *" className="w"><input maxLength={200} value={d.detail} onChange={(e) => setD({ ...d, detail: e.target.value })} /></Field>
          <Field label="Monto *"><MoneyInput maxLength={15} placeholder="0" value={d.amount} onChange={(v) => setD({ ...d, amount: v })} /></Field>
          <Field label="Medio de pago"><select value={d.payment_method} onChange={(e) => setD({ ...d, payment_method: e.target.value })}>{opts(payOpts)}</select></Field>
          <Field label="Comentario" className="w"><input maxLength={200} placeholder="Opcional" value={d.comment} onChange={(e) => setD({ ...d, comment: e.target.value })} /></Field>
        </div>
        <p className="err">{err}</p>
      </div>
    </GymModal>
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
      <PageHeader compact title="Historial de egresos" subtitle="Gastos del gimnasio agrupados por mes y año" actions={<button className="btn primary" onClick={onNew}><Plus /> Ingresar gastos</button>} />
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
