'use client'

import { useMemo, useState } from 'react'
import { api, errMsg } from '@/lib/api-client'
import { useSettings } from '@/hooks/useSettings'
import { useNotify } from '@/hooks/useNotify'
import { useFetch } from '@/hooks/useFetch'
import { GymModal } from '@/components/gym/GymModal'
import { DataGrid, Field, MoneyInput, Pill, opts, type Col } from '@/components/gym/ui'
import { fmtDate, money } from '@/shared/format'
import { todayIso } from '@/shared/dates'
import { durationLabel, planDueDate, planLabel } from '@/shared/domain/payments'
import type { Payment, PaymentStatus, StudentSummary } from '@/shared/types'

export const PaymentPill = ({ status }: { status: PaymentStatus }) => <Pill tone={status.tone}>{status.label}</Pill>

export const studentStatusTone = (s: string) => (s === 'Activo' ? 'ok' : s === 'De baja' ? 'bad' : s === 'Inactivo' ? '' : 'info')
export const StudentStatusPill = ({ status }: { status: string }) => <Pill tone={studentStatusTone(status)}>{status}</Pill>

/** Columnas del historial de pagos (numeradas de más reciente a más antiguo). */
export function historyCols(total: number): Col<Payment>[] {
  return [
    { h: 'N°', cell: (_p, i) => total - i },
    { h: 'Fecha de pago', cell: (p) => (p.pending ? <span className="muted">—</span> : fmtDate(p.paid_on)) },
    { h: 'Plan', cell: (p) => <>{planLabel(p)}{p.pending && <><br /><span className="muted sm">Clase del {fmtDate(p.class_on ?? p.paid_on)}</span></>}</> },
    { h: 'Tipo de pago', cell: (p) => (p.pending ? <Pill tone="warn">Por cobrar</Pill> : p.payment_method) },
    { h: 'Monto', cls: 'r', cell: (p) => money(p.amount) },
    { h: 'Vencimiento', cell: (p) => fmtDate(p.due_date) },
    { h: 'Comentario', cell: (p) => p.notes || <span className="muted">—</span> },
  ]
}

export function PaymentHistoryGrid({ payments, pageSize = 8 }: { payments: Payment[]; pageSize?: number }) {
  return <DataGrid cols={historyCols(payments.length)} rows={payments} pageSize={pageSize} empty="El alumno aún no registra pagos" />
}

/** Modal «Historial de pagos» de un alumno. */
export function PaymentHistoryModal({ studentId, title, onClose }: { studentId: string; title: React.ReactNode; onClose: () => void }) {
  const { data, loading } = useFetch<Payment[]>(`/api/students/${studentId}/payments`)
  return (
    <GymModal title="Historial de pagos" size="lg" onClose={onClose} footer={<button className="btn secondary" onClick={onClose}>Cerrar</button>}>
      <div className="gym">
        <p className="muted sm" style={{ marginBottom: 12 }}>{title} · {data?.length ?? 0} pago(s) registrados</p>
        {loading ? <div className="empty">Cargando…</div> : <PaymentHistoryGrid payments={data ?? []} pageSize={6} />}
      </div>
    </GymModal>
  )
}

/** Resumen «N clase(s) por cobrar · $X» de un alumno (null si no tiene). */
export const PendingNote = ({ s }: { s: Pick<StudentSummary, 'pending_count' | 'pending_amount'> }) =>
  s.pending_count > 0
    ? <Pill tone="warn">{s.pending_count} clase{s.pending_count === 1 ? '' : 's'} por cobrar · {money(s.pending_amount)}</Pill>
    : null

type Mode = 'new' | 'settle'

/**
 * Modal «Registrar pago». El vencimiento se calcula igual que en el servidor (`planDueDate`).
 * Con un plan diario permite dejar la clase «por cobrar» (acumulativa) y, después, cobrar una o varias clases
 * pendientes juntas en el modo «Cobrar clases por cobrar».
 */
export function PaymentModal({
  student, onClose, onDone,
}: { student: { id: string; full_name: string; rut: string }; onClose: () => void; onDone: () => void }) {
  const { data: cfg } = useSettings()
  const { data: history, loading: loadingHistory } = useFetch<Payment[]>(`/api/students/${student.id}/payments`)
  const notify = useNotify()
  const [mode, setMode] = useState<Mode>('new')
  const [planName, setPlanName] = useState('')
  const [method, setMethod] = useState('')
  const [amount, setAmount] = useState<number | ''>('')
  const [paidOn, setPaidOn] = useState(todayIso())
  const [notes, setNotes] = useState('')
  const [defer, setDefer] = useState(false)
  const [picked, setPicked] = useState<Set<string> | null>(null) // null = todas
  const [settleAmount, setSettleAmount] = useState<number | ''>('')
  const [settleTouched, setSettleTouched] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const pending = useMemo(
    () => (history ?? []).filter((p) => p.pending).sort((a, b) => (a.class_on ?? a.paid_on).localeCompare(b.class_on ?? b.paid_on)),
    [history],
  )
  const sel = useMemo(() => pending.filter((p) => !picked || picked.has(p.id)), [pending, picked])
  const selTotal = sel.reduce((t, p) => t + p.amount, 0)
  const settleVal = settleTouched ? settleAmount : selTotal

  const plan = useMemo(() => cfg?.plans.find((p) => p.name === (planName || cfg.plans[0]?.name)), [cfg, planName])
  const isDaily = plan?.unit === 'days'
  const deferring = defer && isDaily
  const methodVal = method || cfg?.payment_methods[0] || ''
  // el monto sugerido sigue al plan hasta que el usuario lo edite
  const [touched, setTouched] = useState(false)
  const amountVal = touched ? amount : plan?.amount ?? ''

  const toggle = (id: string) => {
    const next = new Set(picked ?? pending.map((p) => p.id))
    if (next.has(id)) next.delete(id); else next.add(id)
    setPicked(next)
    setSettleTouched(false)
  }

  const done = (msg: string) => { notify.ok(msg); onDone(); onClose() }

  const submit = async () => {
    if (!paidOn) return setErr('Ingresa una fecha de pago')
    setBusy(true)
    try {
      if (mode === 'settle') {
        if (!sel.length) { setBusy(false); return setErr('Selecciona al menos una clase por cobrar') }
        if (!(Number(settleVal) > 0)) { setBusy(false); return setErr('Ingresa un monto mayor a 0') }
        await api.post('/api/payments/settle', {
          student_id: student.id, payment_ids: sel.map((p) => p.id), payment_method: methodVal, amount: Number(settleVal), paid_on: paidOn, notes,
        })
        return done(sel.length === 1 ? 'Clase cobrada correctamente' : `${sel.length} clases cobradas correctamente`)
      }
      if (!plan) { setBusy(false); return setErr('Selecciona un plan') }
      if (!(Number(amountVal) > 0)) { setBusy(false); return setErr('Ingresa un monto mayor a 0') }
      await api.post('/api/payments', {
        student_id: student.id, plan_name: plan.name, payment_method: methodVal, amount: Number(amountVal), paid_on: paidOn, notes, pending: deferring,
      })
      done(deferring ? 'Clase registrada por cobrar' : 'Pago registrado correctamente')
    } catch (e) {
      setErr(errMsg(e))
      setBusy(false)
    }
  }

  const label = deferring ? 'Dejar por cobrar' : 'Cobrar'

  return (
    <GymModal
      title="Registrar pago" size="mid" onClose={onClose}
      footer={<><button className="btn secondary" onClick={onClose}>Cancelar</button><button className="btn primary" onClick={submit} disabled={busy || !cfg || loadingHistory}>{label}</button></>}
    >
      <div className="gym">
        <p className="muted sm" style={{ marginBottom: 14 }}>Alumno: <b style={{ color: 'hsl(var(--foreground))' }}>{student.full_name}</b> · {student.rut}</p>
        {!cfg ? <div className="empty">Cargando…</div> : (
          <div className="fg">
            {pending.length > 0 && (
              <Field label="Operación" className="w">
                <select value={mode} onChange={(e) => { setMode(e.target.value as Mode); setErr('') }}>
                  <option value="new">Registrar un pago nuevo</option>
                  <option value="settle">Cobrar clases diarias por cobrar ({pending.length} · {money(pending.reduce((t, p) => t + p.amount, 0))})</option>
                </select>
              </Field>
            )}

            {mode === 'settle' ? (
              <>
                <div className="w" style={{ display: 'grid', gap: 6 }}>
                  <span className="muted sm">Clases por cobrar (elige las que paga ahora)</span>
                  {pending.map((p) => (
                    <label key={p.id} style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                      <input type="checkbox" style={{ width: 'auto' }} checked={!picked || picked.has(p.id)} onChange={() => toggle(p.id)} />
                      <span style={{ flex: 1 }}>{fmtDate(p.class_on ?? p.paid_on)} · {p.plan_name}</span>
                      <b>{money(p.amount)}</b>
                    </label>
                  ))}
                </div>
                <Field label="Tipo de pago"><select value={methodVal} onChange={(e) => setMethod(e.target.value)}>{opts(cfg.payment_methods)}</select></Field>
                <Field label={`Monto a cobrar (CLP) · ${sel.length} clase(s)`}><MoneyInput value={settleVal} onChange={(v) => { setSettleAmount(v); setSettleTouched(true) }} /></Field>
                <Field label="Fecha de pago"><input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} /></Field>
                <Field label="Comentario (opcional)"><input maxLength={200} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
              </>
            ) : (
              <>
                <Field label="Plan" className="w">
                  <select value={plan?.name ?? ''} onChange={(e) => { setPlanName(e.target.value); setTouched(false) }}>
                    {cfg.plans.map((p) => <option key={p.name} value={p.name}>{p.name} · {durationLabel(p.unit, p.quantity)} — {money(p.amount)}</option>)}
                  </select>
                </Field>
                {isDaily && (
                  <Field label="Cobro de la clase" className="w">
                    <select value={defer ? 'later' : 'now'} onChange={(e) => setDefer(e.target.value === 'later')}>
                      <option value="now">Pagar ahora</option>
                      <option value="later">Dejar por cobrar (acumulativa)</option>
                    </select>
                  </Field>
                )}
                {!deferring && <Field label="Tipo de pago"><select value={methodVal} onChange={(e) => setMethod(e.target.value)}>{opts(cfg.payment_methods)}</select></Field>}
                <Field label={deferring ? 'Monto por cobrar (CLP)' : 'Monto (CLP)'}><MoneyInput value={amountVal} onChange={(v) => { setAmount(v); setTouched(true) }} /></Field>
                <Field label={deferring ? 'Fecha de la clase' : 'Fecha de pago'}><input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} /></Field>
                <Field label="Vencimiento"><input readOnly value={paidOn && plan ? fmtDate(planDueDate(paidOn, plan)) : '—'} /></Field>
                <Field label="Comentario (opcional)" className="w"><input maxLength={200} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
              </>
            )}
          </div>
        )}
        <p className="err">{err}</p>
      </div>
    </GymModal>
  )
}
