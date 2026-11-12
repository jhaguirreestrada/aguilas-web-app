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
import type { Payment, PaymentStatus } from '@/shared/types'

export const PaymentPill = ({ status }: { status: PaymentStatus }) => <Pill tone={status.tone}>{status.label}</Pill>

export const studentStatusTone = (s: string) => (s === 'Activo' ? 'ok' : s === 'De baja' ? 'bad' : s === 'Inactivo' ? '' : 'info')
export const StudentStatusPill = ({ status }: { status: string }) => <Pill tone={studentStatusTone(status)}>{status}</Pill>

/** Columnas del historial de pagos (numeradas de más reciente a más antiguo). */
export function historyCols(total: number): Col<Payment>[] {
  return [
    { h: 'N°', cell: (_p, i) => total - i },
    { h: 'Fecha de pago', cell: (p) => fmtDate(p.paid_on) },
    { h: 'Plan', cell: (p) => planLabel(p) },
    { h: 'Tipo de pago', cell: (p) => p.payment_method },
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

/** Modal «Registrar pago». El vencimiento se calcula igual que en el servidor (`planDueDate`). */
export function PaymentModal({
  student, onClose, onDone,
}: { student: { id: string; full_name: string; rut: string }; onClose: () => void; onDone: () => void }) {
  const { data: cfg } = useSettings()
  const notify = useNotify()
  const [planName, setPlanName] = useState('')
  const [method, setMethod] = useState('')
  const [amount, setAmount] = useState<number | ''>('')
  const [paidOn, setPaidOn] = useState(todayIso())
  const [notes, setNotes] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const plan = useMemo(() => cfg?.plans.find((p) => p.name === (planName || cfg.plans[0]?.name)), [cfg, planName])
  const methodVal = method || cfg?.payment_methods[0] || ''
  // el monto sugerido sigue al plan hasta que el usuario lo edite
  const [touched, setTouched] = useState(false)
  const amountVal = touched ? amount : plan?.amount ?? ''

  const submit = async () => {
    if (!plan) return setErr('Selecciona un plan')
    if (!(Number(amountVal) > 0)) return setErr('Ingresa un monto mayor a 0')
    if (!paidOn) return setErr('Ingresa una fecha de pago')
    setBusy(true)
    try {
      await api.post('/api/payments', {
        student_id: student.id, plan_name: plan.name, payment_method: methodVal, amount: Number(amountVal), paid_on: paidOn, notes,
      })
      notify.ok('Pago registrado correctamente')
      onDone()
      onClose()
    } catch (e) {
      setErr(errMsg(e))
      setBusy(false)
    }
  }

  return (
    <GymModal
      title="Registrar pago" size="mid" onClose={onClose}
      footer={<><button className="btn secondary" onClick={onClose}>Cancelar</button><button className="btn primary" onClick={submit} disabled={busy || !cfg}>Aceptar</button></>}
    >
      <div className="gym">
        <p className="muted sm" style={{ marginBottom: 14 }}>Alumno: <b style={{ color: 'hsl(var(--foreground))' }}>{student.full_name}</b> · {student.rut}</p>
        {!cfg ? <div className="empty">Cargando…</div> : (
          <div className="fg">
            <Field label="Plan" className="w">
              <select value={plan?.name ?? ''} onChange={(e) => { setPlanName(e.target.value); setTouched(false) }}>
                {cfg.plans.map((p) => <option key={p.name} value={p.name}>{p.name} · {durationLabel(p.unit, p.quantity)} — {money(p.amount)}</option>)}
              </select>
            </Field>
            <Field label="Tipo de pago"><select value={methodVal} onChange={(e) => setMethod(e.target.value)}>{opts(cfg.payment_methods)}</select></Field>
            <Field label="Monto (CLP)"><MoneyInput value={amountVal} onChange={(v) => { setAmount(v); setTouched(true) }} /></Field>
            <Field label="Fecha de pago"><input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} /></Field>
            <Field label="Vencimiento"><input readOnly value={paidOn && plan ? fmtDate(planDueDate(paidOn, plan)) : '—'} /></Field>
            <Field label="Comentario (opcional)" className="w"><input maxLength={200} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          </div>
        )}
        <p className="err">{err}</p>
      </div>
    </GymModal>
  )
}
