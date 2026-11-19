'use client'

import { useMemo, useState } from 'react'
import { History, Pencil, Plus, Trash2 } from 'lucide-react'
import { api } from '@/lib/api-client'
import { useFetch } from '@/hooks/useFetch'
import { useSettings } from '@/hooks/useSettings'
import { useNotify } from '@/hooks/useNotify'
import { useConfirm } from '@/components/providers/ConfirmProvider'
import { DataGrid, Field, PageHeader, opts } from '@/components/gym/ui'
import { PaymentHistoryModal, PaymentModal, PaymentPill, StudentStatusPill } from '@/features/common/payments'
import { StudentModal } from '@/features/students/StudentModal'
import { fmtDate, norm } from '@/shared/format'
import { cleanRut } from '@/shared/rut'
import { waUrl } from '@/lib/whatsapp'
import { WhatsAppIcon } from '@/components/gym/icons'
import type { StudentSummary } from '@/shared/types'

export default function StudentsPage() {
  const notify = useNotify()
  const confirm = useConfirm()
  const { data: cfg } = useSettings()
  const { data, loading, reload } = useFetch<StudentSummary[]>('/api/students')
  const [f, setF] = useState({ rut: '', name: '', status: '', pay: '' })
  const [editing, setEditing] = useState<string | null | undefined>(undefined) // undefined = cerrado, null = nuevo
  const [history, setHistory] = useState<StudentSummary | null>(null)
  const [paying, setPaying] = useState<StudentSummary | null>(null)

  const rows = useMemo(() => {
    const c = cleanRut(f.rut)
    const toks = norm(f.name).split(/\s+/).filter(Boolean)
    return (data ?? []).filter((a) =>
      (!c || cleanRut(a.rut).includes(c)) &&
      toks.every((t) => norm(a.full_name).includes(t)) &&
      (!f.status || a.status === f.status) &&
      (!f.pay || a.payment_status.key === f.pay))
  }, [data, f])

  const whatsapp = (s: StudentSummary) => {
    if (!cfg) return
    const url = waUrl(s, cfg)
    if (!url) return notify.error('El alumno no tiene celular registrado')
    window.open(url, '_blank', 'noopener')
  }

  const remove = async (a: StudentSummary) => {
    const n = a.payments_count
    const ok = await confirm({
      title: 'Eliminar alumno', danger: true, okLabel: 'Eliminar',
      message: <>Se eliminará a <b>{a.full_name}</b>{n ? <> junto con sus <b>{n}</b> pago(s) registrados</> : null}. Esta acción no se puede deshacer.</>,
    })
    if (!ok) return
    try { await api.del(`/api/students/${a.id}`); notify.ok('Alumno eliminado'); reload() } catch (e) { notify.fail(e) }
  }

  return (
    <div className="gym">
      <PageHeader title="Alumnos" subtitle="Mantenedor de alumnos del gimnasio" actions={<button className="btn primary" onClick={() => setEditing(null)}><Plus /> Nuevo Alumno</button>} />
      <div className="card">
        <div className="toolbar">
          <Field label="RUT"><input placeholder="Buscar RUT" value={f.rut} onChange={(e) => setF({ ...f, rut: e.target.value })} /></Field>
          <Field label="Nombre + Apellido"><input placeholder="Buscar nombre" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Estado alumno">
            <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="">Todos</option>{opts(cfg?.student_statuses ?? [])}</select>
          </Field>
          <Field label="Estado último pago">
            <select value={f.pay} onChange={(e) => setF({ ...f, pay: e.target.value })}>
              <option value="">Todos</option>
              {opts([{ value: 'CURRENT', label: 'Vigente' }, { value: 'DUE_SOON', label: 'Por Vencer' }, { value: 'OVERDUE', label: 'Vencido' }, { value: 'NONE', label: 'Sin pagos' }])}
            </select>
          </Field>
        </div>
        <DataGrid<StudentSummary>
          rows={rows} pageSize={10} resetKey={JSON.stringify(f)}
          empty={loading ? 'Cargando…' : 'No hay alumnos que coincidan con los filtros'}
          cols={[
            { h: 'RUT', cell: (a) => a.rut },
            { h: 'Alumno', cell: (a) => <><b>{a.full_name}</b><br /><span className="muted sm">{a.phone}</span></> },
            { h: 'Categoría', cell: (a) => a.category || <span className="muted">—</span> },
            { h: 'Estado alumno', cell: (a) => <StudentStatusPill status={a.status} /> },
            { h: 'Último estado de pago', cell: (a) => (
              <>
                <PaymentPill status={a.payment_status} />
                {a.last_payment && <><br /><span className="muted sm">Vence {fmtDate(a.last_payment.due_date)}{a.payment_status.days_overdue ? ` · ${a.payment_status.days_overdue} d. retraso` : ''}</span></>}
              </>
            ) },
            { h: 'Editar', cls: 'c', cell: (a) => <div className="acts"><button className="btn secondary sm ico" title="Editar" onClick={() => setEditing(a.id)}><Pencil /></button></div> },
            { h: 'Eliminar', cls: 'c', cell: (a) => <div className="acts"><button className="btn secondary sm ico" title="Eliminar" style={{ color: 'hsl(var(--destructive))' }} onClick={() => remove(a)}><Trash2 /></button></div> },
            { h: 'Historial de Pagos', cls: 'c', cell: (a) => <div className="acts"><button className="btn secondary sm ico" title="Historial de pagos" onClick={() => setHistory(a)}><History /></button></div> },
            { h: 'WhatsApp', cls: 'c', cell: (a) => <div className="acts"><button className="btn sm ico" title="Enviar WhatsApp" onClick={() => whatsapp(a)}><WhatsAppIcon /></button></div> },
          ]}
        />
      </div>

      {editing !== undefined && (
        <StudentModal
          studentId={editing}
          onClose={() => setEditing(undefined)}
          onSaved={(created) => {
            reload()
            if (created && created.status !== 'De baja') setPaying(created) // igual que el original: tras crear, ofrece registrar el primer pago
          }}
        />
      )}
      {history && <PaymentHistoryModal studentId={history.id} title={<><b style={{ color: 'hsl(var(--foreground))' }}>{history.full_name}</b> · {history.rut}</>} onClose={() => setHistory(null)} />}
      {paying && <PaymentModal student={paying} onClose={() => setPaying(null)} onDone={reload} />}
    </div>
  )
}
