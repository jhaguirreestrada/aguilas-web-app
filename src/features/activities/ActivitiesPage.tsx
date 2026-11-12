'use client'

import { useMemo, useState } from 'react'
import { Ban, Check, ClipboardList, History, Pencil, Play, Plus, Trash2, Undo2 } from 'lucide-react'
import { api, errMsg } from '@/lib/api-client'
import { useFetch } from '@/hooks/useFetch'
import { useNotify } from '@/hooks/useNotify'
import { useConfirm } from '@/components/providers/ConfirmProvider'
import { GymModal } from '@/components/gym/GymModal'
import { DataGrid, Field, PageHeader, Pill, Tabs, opts } from '@/components/gym/ui'
import { diffDays, todayIso } from '@/shared/dates'
import { fmtDate, norm } from '@/shared/format'
import { ACTIVITY_LABEL, ACTIVITY_TONE, PRIORITY_LABEL, PRIORITY_ORDER, PRIORITY_TONE } from '@/shared/labels'
import type { Activity, ActivityPriority, ActivityStatus } from '@/shared/types'

type Tab = 'active' | 'history'
const closed = (a: Activity) => a.status === 'done' || a.status === 'dropped'
const overdue = (a: Activity, today: string) => !closed(a) && !!a.end_date && a.end_date < today
const rank = (a: Activity) => PRIORITY_ORDER.indexOf(a.priority)
const match = (a: Activity, q: string) => !q || norm(`${a.name} ${a.notes}`).includes(norm(q))

export default function ActivitiesPage() {
  const notify = useNotify()
  const confirm = useConfirm()
  const { data, reload, loading } = useFetch<Activity[]>('/api/activities')
  const [tab, setTab] = useState<Tab>('active')
  const [editing, setEditing] = useState<Activity | null | undefined>(undefined)
  const [fa, setFa] = useState({ q: '', prio: '', status: '' })
  const [fh, setFh] = useState({ q: '', status: '' })
  const today = todayIso()
  const all = data ?? []
  const n = (s: ActivityStatus) => all.filter((a) => a.status === s).length

  const active = useMemo(() => all.filter((a) => !closed(a) && match(a, fa.q) && (!fa.prio || a.priority === fa.prio) && (!fa.status || a.status === fa.status))
    .sort((a, b) => rank(a) - rank(b) || a.end_date.localeCompare(b.end_date) || a.start_date.localeCompare(b.start_date)), [all, fa])
  const hist = useMemo(() => all.filter((a) => closed(a) && match(a, fh.q) && (!fh.status || a.status === fh.status))
    .sort((a, b) => (b.closed_on ?? '').localeCompare(a.closed_on ?? '') || rank(a) - rank(b)), [all, fh])

  const go = async (a: Activity, to: ActivityStatus, msg: string) => {
    try { await api.post(`/api/activities/${a.id}/transition`, { to }); notify.ok(msg); reload() } catch (e) { notify.fail(e) }
  }
  const drop = async (a: Activity) => {
    if (await confirm({ title: 'Dar de baja la actividad', danger: true, okLabel: 'Dar de baja', message: <><b>{a.name}</b> pasará al historial con estado «De baja».</> })) go(a, 'dropped', 'Actividad dada de baja')
  }
  const del = async (a: Activity) => {
    if (!(await confirm({ title: 'Eliminar actividad', danger: true, okLabel: 'Eliminar', message: <>Se eliminará <b>{a.name}</b> del historial. Esta acción no se puede deshacer.</> }))) return
    try { await api.del(`/api/activities/${a.id}`); notify.ok('Actividad eliminada'); reload() } catch (e) { notify.fail(e) }
  }

  const prio = (a: Activity) => <Pill tone={PRIORITY_TONE[a.priority]}>{PRIORITY_LABEL[a.priority]}</Pill>
  const state = (a: Activity) => <Pill tone={ACTIVITY_TONE[a.status]}>{ACTIVITY_LABEL[a.status]}</Pill>
  const name = (a: Activity) => <><b>{a.name}</b>{a.notes && <><br /><span className="muted sm">{a.notes}</span></>}</>

  return (
    <div className="gym">
      <PageHeader title="Planificación" subtitle="Actividades por realizar en el gimnasio, con prioridad y seguimiento" actions={<button className="btn primary" onClick={() => setEditing(null)}><Plus /> Nueva actividad</button>} />
      <div className="kpis">
        {([['Pendientes', n('pending'), 'k-pend main'], ['En proceso', n('in_progress'), 'k-proc'], ['Vencidas', all.filter((a) => overdue(a, today)).length, 'k-venc'], ['Terminadas', n('done'), 'k-term']] as const).map(([l, v, c]) => (
          <div key={l} className={`kpi kc ${c}`}><span>{l}</span><b>{v}</b></div>
        ))}
      </div>
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ key: 'active', label: 'Actividades', icon: <ClipboardList /> }, { key: 'history', label: 'Historial', icon: <History /> }]} />

      {tab === 'active' ? (
        <div className="card">
          <div className="toolbar">
            <Field label="Actividad" className=""><input placeholder="Buscar actividad o comentario" value={fa.q} onChange={(e) => setFa({ ...fa, q: e.target.value })} /></Field>
            <Field label="Prioridad"><select value={fa.prio} onChange={(e) => setFa({ ...fa, prio: e.target.value })}><option value="">Todas</option>{opts(PRIORITY_ORDER.map((p) => ({ value: p, label: PRIORITY_LABEL[p] })))}</select></Field>
            <Field label="Estado"><select value={fa.status} onChange={(e) => setFa({ ...fa, status: e.target.value })}><option value="">Todos</option>{opts([{ value: 'pending', label: 'Pendiente' }, { value: 'in_progress', label: 'En Proceso' }])}</select></Field>
          </div>
          <DataGrid<Activity> rows={active} pageSize={10} resetKey={JSON.stringify(fa)} empty={loading ? 'Cargando…' : 'No hay actividades pendientes ni en proceso'} cols={[
            { h: 'Prioridad', cell: prio }, { h: 'Actividad', cell: name },
            { h: 'Inicio', cell: (a) => fmtDate(a.start_date) },
            { h: 'Fin', cell: (a) => <>{fmtDate(a.end_date)}{overdue(a, today) && <><br /><span className="sm" style={{ color: 'hsl(var(--destructive))', fontWeight: 700 }}>Vencida hace {diffDays(today, a.end_date)} d.</span></>}</> },
            { h: 'Estado', cell: state },
            { h: 'Acciones', cls: 'c', cell: (a) => (
              <div className="acts">
                {a.status === 'pending' && <button className="btn secondary sm ico" title="Iniciar" onClick={() => go(a, 'in_progress', 'Actividad en proceso')}><Play /></button>}
                <button className="btn secondary sm ico" style={{ color: 'hsl(var(--success))' }} title="Marcar como terminada" onClick={() => go(a, 'done', 'Actividad terminada: pasó al historial')}><Check /></button>
                <button className="btn secondary sm ico" title="Editar" onClick={() => setEditing(a)}><Pencil /></button>
                <button className="btn secondary sm ico" title="Dar de baja" onClick={() => drop(a)}><Ban /></button>
              </div>
            ) },
          ]} />
        </div>
      ) : (
        <div className="card">
          <div className="toolbar">
            <Field label="Actividad" className=""><input placeholder="Buscar actividad o comentario" value={fh.q} onChange={(e) => setFh({ ...fh, q: e.target.value })} /></Field>
            <Field label="Estado"><select value={fh.status} onChange={(e) => setFh({ ...fh, status: e.target.value })}><option value="">Todos</option>{opts([{ value: 'done', label: 'Terminado' }, { value: 'dropped', label: 'De baja' }])}</select></Field>
          </div>
          <DataGrid<Activity> rows={hist} pageSize={10} resetKey={JSON.stringify(fh)} empty="Aún no hay actividades terminadas" cols={[
            { h: 'Actividad', cell: name }, { h: 'Prioridad', cell: prio },
            { h: 'Inicio', cell: (a) => fmtDate(a.start_date) }, { h: 'Fin planificado', cell: (a) => fmtDate(a.end_date) },
            { h: 'Cierre', cell: (a) => fmtDate(a.closed_on) }, { h: 'Estado', cell: state },
            { h: 'Acciones', cls: 'c', cell: (a) => (
              <div className="acts">
                <button className="btn secondary sm ico" title="Reabrir (volver a Pendiente)" onClick={() => go(a, 'pending', 'Actividad reabierta como Pendiente')}><Undo2 /></button>
                <button className="btn secondary sm ico" title="Editar" onClick={() => setEditing(a)}><Pencil /></button>
                <button className="btn secondary sm ico" style={{ color: 'hsl(var(--destructive))' }} title="Eliminar" onClick={() => del(a)}><Trash2 /></button>
              </div>
            ) },
          ]} />
        </div>
      )}

      {editing !== undefined && <ActivityModal activity={editing} onClose={() => setEditing(undefined)} onSaved={reload} />}
    </div>
  )
}

function ActivityModal({ activity, onClose, onSaved }: { activity: Activity | null; onClose: () => void; onSaved: () => void }) {
  const notify = useNotify()
  const [d, setD] = useState({
    name: activity?.name ?? '', priority: (activity?.priority ?? 'medium') as ActivityPriority, status: (activity?.status ?? 'pending') as ActivityStatus,
    start_date: activity?.start_date ?? todayIso(), end_date: activity?.end_date ?? '', notes: activity?.notes ?? '',
  })
  const [err, setErr] = useState('')

  const save = async () => {
    if (!d.name.trim()) return setErr('El nombre de la actividad es obligatorio')
    if (!d.start_date || !d.end_date) return setErr('Ingresa la fecha de inicio y la fecha de fin')
    if (d.end_date < d.start_date) return setErr('La fecha de fin no puede ser anterior a la de inicio')
    try {
      const body = { ...d, name: d.name.trim(), notes: d.notes.trim() }
      if (activity) await api.put(`/api/activities/${activity.id}`, body)
      else await api.post('/api/activities', body)
      notify.ok(activity ? 'Actividad actualizada' : 'Actividad creada'); onSaved(); onClose()
    } catch (e) { setErr(errMsg(e)) }
  }

  return (
    <GymModal title={activity ? 'Editar actividad' : 'Nueva actividad'} size="mid" onClose={onClose} footer={<><button className="btn secondary" onClick={onClose}>Cancelar</button><button className="btn primary" onClick={save}>Guardar</button></>}>
      <div className="gym">
        <div className="fg">
          <Field label="Actividad *" className="w"><input maxLength={120} placeholder="Ej: Cambiar el piso del ring" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></Field>
          <Field label="Prioridad *"><select value={d.priority} onChange={(e) => setD({ ...d, priority: e.target.value as ActivityPriority })}>{opts(PRIORITY_ORDER.map((p) => ({ value: p, label: PRIORITY_LABEL[p] })))}</select></Field>
          <Field label="Estado"><select value={d.status} onChange={(e) => setD({ ...d, status: e.target.value as ActivityStatus })}>{opts((Object.keys(ACTIVITY_LABEL) as ActivityStatus[]).map((s) => ({ value: s, label: ACTIVITY_LABEL[s] })))}</select></Field>
          <Field label="Fecha de inicio *"><input type="date" value={d.start_date} onChange={(e) => setD({ ...d, start_date: e.target.value })} /></Field>
          <Field label="Fecha de fin *"><input type="date" value={d.end_date} onChange={(e) => setD({ ...d, end_date: e.target.value })} /></Field>
          <Field label="Comentario (opcional)" className="w"><textarea maxLength={400} value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} /></Field>
        </div>
        <p className="err">{err}</p>
      </div>
    </GymModal>
  )
}
