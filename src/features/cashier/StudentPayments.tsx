'use client'

import { useCallback, useEffect, useState } from 'react'
import { CreditCard, History, Search, Users } from 'lucide-react'
import { api, errMsg, qs } from '@/lib/api-client'
import { useDebounced } from '@/hooks/useDebounced'
import { useNotify } from '@/hooks/useNotify'
import { Empty, Field, Tabs } from '@/components/gym/ui'
import { PaymentHistoryGrid, PaymentModal, PaymentPill, StudentStatusPill } from '@/features/common/payments'
import { fmtDate, money } from '@/shared/format'
import { planLabel } from '@/shared/domain/payments'
import type { Payment, StudentSummary } from '@/shared/types'

type Tab = 'data' | 'history'

/** Pestaña «Pago alumnos» de Caja y Ventas: busca al alumno, muestra su último pago y registra pagos de mensualidad. */
export default function StudentPayments() {
  const notify = useNotify()
  const [q, setQ] = useState('')
  const dq = useDebounced(q, 250)
  const [results, setResults] = useState<StudentSummary[]>([])
  const [selected, setSelected] = useState<StudentSummary | null>(null)
  const [history, setHistory] = useState<Payment[]>([])
  const [tab, setTab] = useState<Tab>('data')
  const [msg, setMsg] = useState('')
  const [paying, setPaying] = useState(false)

  const refreshSelected = useCallback(async (id: string) => {
    const [s, h] = await Promise.all([api.get<StudentSummary>(`/api/students/${id}`), api.get<Payment[]>(`/api/students/${id}/payments`)])
    setSelected(s)
    setHistory(h)
  }, [])

  const search = useCallback(async (term: string, explicit = false) => {
    const t = term.trim()
    setMsg('')
    if (!t) {
      setResults([]); setSelected(null)
      if (explicit) { setMsg('Ingresa un RUT o nombre y apellido para buscar (campo obligatorio)'); notify.error('El campo de búsqueda es obligatorio') }
      return
    }
    try {
      const found = await api.get<StudentSummary[]>(`/api/students/search${qs({ q: t })}`)
      if (!found.length) { setResults([]); setSelected(null); setMsg('No se encontraron alumnos con ese criterio'); return }
      if (found.length === 1) { setResults([]); await refreshSelected(found[0].id); return }
      setResults(found)
      setSelected((cur) => (cur && found.some((f) => f.id === cur.id) ? cur : null))
    } catch (e) { notify.fail(e) }
  }, [notify, refreshSelected])

  useEffect(() => { search(dq) }, [dq]) // eslint-disable-line react-hooks/exhaustive-deps

  const pick = async (s: StudentSummary) => {
    setQ(s.full_name); setResults([])
    try { await refreshSelected(s.id) } catch (e) { notify.fail(e) }
  }

  const up = selected?.last_payment
  const e = selected?.payment_status

  return (
    <>
      <div className="card">
        <h2>Pago de alumnos</h2>
        <p className="sub">Busca al alumno por RUT o por nombre y apellido para ver sus datos y último pago</p>
        <div className="toolbar" style={{ margin: 0 }}>
          <div style={{ flex: 3 }}>
            <Field label="RUT o Nombre + Apellido">
              <input value={q} autoComplete="off" placeholder="Ej: 18.345.678-9  ó  Juan Pérez" onChange={(ev) => setQ(ev.target.value)}
                onKeyDown={(ev) => { if (ev.key === 'Enter') { ev.preventDefault(); search(q, true) } }} />
            </Field>
          </div>
          <div className="fx"><button className="btn action" onClick={() => search(q, true)}><Search /> Buscar</button></div>
        </div>
        {msg && (msg.startsWith('No se') ? <Empty>{msg}</Empty> : <p className="err">{msg}</p>)}
        {results.length > 0 && (
          <>
            <div className="pick">
              {results.slice(0, 8).map((a) => (
                <button key={a.id} onClick={() => pick(a)}>
                  <span><b>{a.full_name}</b> <span className="muted sm">{a.rut}</span></span>
                  <PaymentPill status={a.payment_status} />
                </button>
              ))}
            </div>
            {results.length > 8 && <p className="muted sm" style={{ marginTop: 6 }}>Mostrando 8 de {results.length}. Afina la búsqueda.</p>}
          </>
        )}
      </div>

      {selected && e && (
        <>
          <Tabs<Tab> value={tab} onChange={setTab} tabs={[
            { key: 'data', label: 'Datos del alumno', icon: <Users /> },
            { key: 'history', label: 'Historial de pagos', icon: <History /> },
          ]} />

          {tab === 'history' ? (
            <div className="card">
              <h2>Historial de pagos</h2>
              <p className="sub">{selected.full_name} · {selected.rut}</p>
              <PaymentHistoryGrid payments={history} />
            </div>
          ) : (
            <div className="two">
              <div className="card" style={{ order: 1 }}>
                <h2>Último pago</h2>
                <p className="sub">{up ? 'Estado de la membresía' : 'El alumno aún no registra pagos'}</p>
                {up ? (
                  <div className="kv">
                    <div><span>Fecha de pago</span><b>{fmtDate(up.paid_on)}</b></div>
                    <div><span>Fecha de vencimiento</span><b>{fmtDate(up.due_date)}</b></div>
                    <div><span>Plan · Monto</span><b>{planLabel(up)} · {money(up.amount)}</b></div>
                    <div><span>Tipo de pago</span><b>{up.payment_method}</b></div>
                    <div className="est-row"><span>Estado de pago</span><b><PaymentPill status={e} /></b></div>
                    <div><span>{e.key === 'OVERDUE' ? 'Días de retraso' : 'Días restantes'}</span>
                      <b style={e.key === 'OVERDUE' ? { color: 'hsl(var(--destructive))' } : undefined}>{e.key === 'OVERDUE' ? e.days_overdue : e.days_left}</b></div>
                  </div>
                ) : <Empty>Sin pagos registrados</Empty>}
              </div>
              <div className="card" style={{ order: 2 }}>
                <div className="kv">
                  <div className="est-row"><span>Estado</span><b><StudentStatusPill status={selected.status} /></b></div>
                  <div><span>Nombre</span><b>{selected.full_name}</b></div>
                  <div><span>RUT</span><b>{selected.rut}</b></div>
                  <div><span>Edad</span><b>{selected.age ?? '—'}{selected.age != null ? ' años' : ''}</b></div>
                  <div><span>Categoría</span><b>{selected.category || '—'}{selected.weight_kg ? ` · ${selected.weight_kg} kg` : ''}</b></div>
                  <div><span>Celular</span><b>{selected.phone || '—'}</b></div>
                  <div><span>Correo</span><b style={{ wordBreak: 'break-all' }}>{selected.email || '—'}</b></div>
                </div>
                {selected.status === 'De baja' && (
                  <p className="err" style={{ marginTop: 12 }}>Dado de baja el {fmtDate(selected.withdrawn_on)}. Motivo: {selected.withdrawal_reason || selected.notes || '—'}</p>
                )}
              </div>
            </div>
          )}

          <div className="row-actions" style={{ marginBottom: 16 }}>
            <button className="btn primary" disabled={selected.status === 'De baja'} title={selected.status === 'De baja' ? 'Alumno de baja' : undefined} onClick={() => setPaying(true)}>
              <CreditCard /> Realizar Pago
            </button>
          </div>
        </>
      )}

      {paying && selected && (
        <PaymentModal student={selected} onClose={() => setPaying(false)} onDone={() => refreshSelected(selected.id).catch((er) => notify.error(errMsg(er)))} />
      )}
    </>
  )
}
