'use client'

import { useEffect, useMemo, useState } from 'react'
import { CreditCard, History, Undo2, Users } from 'lucide-react'
import { api, errMsg } from '@/lib/api-client'
import { useSettings } from '@/hooks/useSettings'
import { useNotify } from '@/hooks/useNotify'
import { useConfirm } from '@/components/providers/ConfirmProvider'
import { GymModal } from '@/components/gym/GymModal'
import { DataGrid, Empty, Field, RutInput, Tabs, opts } from '@/components/gym/ui'
import { PaymentHistoryGrid, PaymentModal, PaymentPill } from '@/features/common/payments'
import { fmtDate, money } from '@/shared/format'
import { todayIso } from '@/shared/dates'
import { planLabel } from '@/shared/domain/payments'
import { weightCategoryOf } from '@/shared/domain/students'
import { validRut } from '@/shared/rut'
import type { Payment, StudentSummary, WeightEntry } from '@/shared/types'

interface Props {
  studentId: string | null
  onClose: () => void
  /** Se invoca tras guardar; `created` trae el alumno nuevo para ofrecer el primer pago. */
  onSaved: (created?: StudentSummary) => void
}

type Tab = 'gen' | 'pay'

const EMPTY = {
  first_names: '', last_names: '', rut: '', birth_date: '', sex: '' as '' | 'F' | 'M', weight_kg: '' as string,
  phone: '', email: '', notes: '', status: 'Activo', joined_on: todayIso(),
}

export function StudentModal({ studentId, onClose, onSaved }: Props) {
  const { data: cfg } = useSettings()
  const notify = useNotify()
  const confirm = useConfirm()
  const [form, setForm] = useState(EMPTY)
  const [student, setStudent] = useState<StudentSummary | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(!!studentId)
  const [tab, setTab] = useState<Tab>('gen')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [paying, setPaying] = useState(false)
  const [showWeights, setShowWeights] = useState(false)

  const load = async () => {
    if (!studentId) return
    const [s, p] = await Promise.all([api.get<StudentSummary>(`/api/students/${studentId}`), api.get<Payment[]>(`/api/students/${studentId}/payments`)])
    setStudent(s); setPayments(p)
    setForm({
      first_names: s.first_names, last_names: s.last_names, rut: s.rut, birth_date: s.birth_date ?? '', sex: s.sex ?? '',
      weight_kg: s.weight_kg == null ? '' : String(s.weight_kg), phone: s.phone, email: s.email, notes: s.notes,
      status: s.status, joined_on: s.joined_on ?? '',
    })
  }

  useEffect(() => {
    load().catch((e) => { notify.fail(e); onClose() }).finally(() => setLoading(false))
  }, [studentId]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) => setForm((f) => ({ ...f, [k]: v }))

  const category = useMemo(
    () => (cfg ? weightCategoryOf(form.sex || null, form.weight_kg === '' ? null : Number(form.weight_kg), cfg.weight_categories_female, cfg.weight_categories_male) : ''),
    [cfg, form.sex, form.weight_kg],
  )

  const save = async () => {
    const v = (s: string) => s.trim()
    if (!v(form.first_names) || !v(form.last_names)) return setErr('Nombres y apellidos son obligatorios')
    if (!validRut(form.rut)) return setErr('El RUT no es válido (revisa el dígito verificador)')
    if (!form.sex) return setErr('Selecciona el sexo del alumno')
    if (form.weight_kg !== '' && !(Number(form.weight_kg) > 0)) return setErr('El peso debe ser mayor a 0')
    if (v(form.email) && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v(form.email))) return setErr('El correo no es válido')
    setBusy(true); setErr('')
    const body = {
      first_names: v(form.first_names), last_names: v(form.last_names), rut: form.rut, birth_date: form.birth_date || null, sex: form.sex,
      weight_kg: form.weight_kg === '' ? null : Number(form.weight_kg), phone: v(form.phone), email: v(form.email), notes: v(form.notes),
      status: form.status, joined_on: form.joined_on || null,
    }
    try {
      if (studentId) {
        await api.put(`/api/students/${studentId}`, body)
        notify.ok('Alumno actualizado'); onSaved(); onClose()
      } else {
        const created = await api.post<StudentSummary>('/api/students', body)
        notify.ok('Alumno creado'); onSaved(created); onClose()
      }
    } catch (e) {
      setErr(errMsg(e)); setBusy(false)
    }
  }

  const reactivate = async () => {
    if (!studentId) return
    if (!(await confirm({ title: 'Reactivar alumno', message: 'El alumno volverá al estado «Activo».', okLabel: 'Reactivar' }))) return
    try { await api.post(`/api/students/${studentId}/reactivate`); notify.ok('Alumno reactivado'); onSaved(); onClose() } catch (e) { notify.fail(e) }
  }

  const up = student?.last_payment
  const st = student?.payment_status

  return (
    <>
      <GymModal
        title={studentId ? 'Editar alumno' : 'Nuevo alumno'} size="xl" onClose={onClose}
        footer={
          <>
            <button className="btn secondary" onClick={onClose}>Cancelar</button>
            {student?.status === 'De baja' && <button className="btn secondary" onClick={reactivate}><Undo2 /> Reactivar alumno</button>}
            {studentId && <button className="btn secondary" disabled={student?.status === 'De baja'} title={student?.status === 'De baja' ? 'Alumno de baja' : undefined} onClick={() => setPaying(true)}><CreditCard /> Realizar Pago</button>}
            <button className="btn primary" onClick={save} disabled={busy || loading || !cfg}>Guardar</button>
          </>
        }
      >
        <div className="gym">
          {loading || !cfg ? <div className="empty">Cargando…</div> : (
            <>
              {studentId && (
                <Tabs<Tab> value={tab} onChange={setTab} tabs={[
                  { key: 'gen', label: 'Datos generales', icon: <Users /> },
                  { key: 'pay', label: 'Pagos', icon: <CreditCard /> },
                ]} />
              )}

              <div style={{ display: tab === 'gen' ? undefined : 'none' }}>
                <div className="fg fg3">
                  <Field label="Nombres *"><input maxLength={80} value={form.first_names} onChange={(e) => set('first_names', e.target.value)} /></Field>
                  <Field label="Apellidos *"><input maxLength={80} value={form.last_names} onChange={(e) => set('last_names', e.target.value)} /></Field>
                  <Field label="RUT *"><RutInput value={form.rut} onChange={(v) => set('rut', v)} /></Field>
                  <Field label="Fecha de nacimiento"><input type="date" value={form.birth_date} onChange={(e) => set('birth_date', e.target.value)} /></Field>
                  <Field label="Sexo *">
                    <select value={form.sex} onChange={(e) => set('sex', e.target.value as '' | 'F' | 'M')}>
                      <option value="">Seleccionar</option><option value="F">Femenino</option><option value="M">Masculino</option>
                    </select>
                  </Field>
                  <Field label="Peso (kg)">
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input type="number" min={0} max={250} step={0.1} value={form.weight_kg} onChange={(e) => set('weight_kg', e.target.value)} />
                      {studentId && <button type="button" className="btn secondary ico" title="Ver historial de peso" aria-label="Ver historial de peso" onClick={() => setShowWeights(true)}><History /></button>}
                    </div>
                  </Field>
                  <Field label="Categoría (automática)"><input readOnly value={category || '—'} /></Field>
                  <Field label="Celular"><input maxLength={20} placeholder="+56 9 1234 5678" value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
                  <Field label="Correo electrónico"><input type="email" maxLength={120} value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
                  <Field label="Estado del alumno"><select value={form.status} onChange={(e) => set('status', e.target.value)}>{opts(cfg.student_statuses)}</select></Field>
                  <Field label="Fecha de ingreso"><input type="date" value={form.joined_on} onChange={(e) => set('joined_on', e.target.value)} /></Field>
                  <Field label="Comentario" className="w"><textarea maxLength={300} value={form.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
                </div>
              </div>

              {studentId && tab === 'pay' && (
                <div>
                  <div className="sect-title">Último pago</div>
                  {up && st ? (
                    <div className="kv">
                      <div><span>Fecha de pago</span><b>{fmtDate(up.paid_on)}</b></div>
                      <div><span>Fecha de vencimiento</span><b>{fmtDate(up.due_date)}</b></div>
                      <div><span>Plan · Monto</span><b>{planLabel(up)} · {money(up.amount)}</b></div>
                      <div><span>Tipo de pago</span><b>{up.payment_method}</b></div>
                      <div><span>Estado de pago</span><b><PaymentPill status={st} /></b></div>
                      <div><span>{st.key === 'OVERDUE' ? 'Días de retraso' : 'Días restantes'}</span>
                        <b style={st.key === 'OVERDUE' ? { color: 'hsl(var(--destructive))' } : undefined}>{st.key === 'OVERDUE' ? st.days_overdue : st.days_left}</b></div>
                    </div>
                  ) : <Empty>El alumno aún no registra pagos</Empty>}
                  <div className="sect-title" style={{ marginTop: 28 }}>Historial de pagos</div>
                  <PaymentHistoryGrid payments={payments} pageSize={5} />
                </div>
              )}
              <p className="err">{err}</p>
            </>
          )}
        </div>
      </GymModal>

      {paying && student && <PaymentModal student={student} onClose={() => setPaying(false)} onDone={() => { load().catch(() => undefined); onSaved() }} />}
      {showWeights && student && <WeightHistoryModal student={student} onClose={() => setShowWeights(false)} />}
    </>
  )
}

function WeightHistoryModal({ student, onClose }: { student: StudentSummary; onClose: () => void }) {
  const [rows, setRows] = useState<WeightEntry[] | null>(null)
  useEffect(() => { api.get<WeightEntry[]>(`/api/students/${student.id}/weight-history`).then(setRows).catch(() => setRows([])) }, [student.id])
  const fmt = (f: string) => new Date(f).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  return (
    <GymModal title="Historial de peso" onClose={onClose} footer={<button className="btn secondary" onClick={onClose}>Cerrar</button>}>
      <div className="gym">
        <p className="muted sm" style={{ marginBottom: 12 }}><b style={{ color: 'hsl(var(--foreground))' }}>{student.full_name}</b> · {student.rut}</p>
        {rows === null ? <div className="empty">Cargando…</div> : (
          <DataGrid rows={rows} pageSize={8} empty="Aún no hay registros de peso" cols={[
            { h: 'Fecha', cell: (r) => fmt(r.recorded_at) },
            { h: 'Peso', cls: 'r', cell: (r) => <b>{r.weight_kg} kg</b> },
            { h: 'Variación', cls: 'r', cell: (r, i) => {
              const prev = rows[i + 1]
              if (!prev) return '—'
              const d = Number(r.weight_kg) - Number(prev.weight_kg)
              return <span className={`delta ${d > 0 ? 'up' : d < 0 ? 'down' : ''}`}>{d > 0 ? '+' : ''}{d.toFixed(1)} kg</span>
            } },
          ]} />
        )}
      </div>
    </GymModal>
  )
}
