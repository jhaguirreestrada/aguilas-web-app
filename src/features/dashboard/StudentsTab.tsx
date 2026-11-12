'use client'

import { useState } from 'react'
import { CreditCard, MessageCircle } from 'lucide-react'
import { useSettings } from '@/hooks/useSettings'
import { useNotify } from '@/hooks/useNotify'
import { DataGrid, Empty, Kpi } from '@/components/gym/ui'
import { Donut, HBars } from '@/components/gym/charts'
import { PaymentModal, PaymentPill } from '@/features/common/payments'
import { waUrl } from '@/lib/whatsapp'
import { fmtDate, money, num } from '@/shared/format'
import { planLabel } from '@/shared/domain/payments'
import type { DashboardData } from '@/shared/dashboard'
import type { StudentSummary } from '@/shared/types'

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

export function StudentsTab({ D, onChanged }: { D: DashboardData; onChanged: () => void }) {
  const notify = useNotify()
  const { data: cfg } = useSettings()
  const [paying, setPaying] = useState<StudentSummary | null>(null)
  const c = D.current
  const p = D.previous
  const dist = D.status_distribution
  const pend = dist.OVERDUE + dist.DUE_SOON

  const whatsapp = (s: StudentSummary) => {
    if (!cfg) return
    const url = waUrl(s, cfg)
    if (!url) return notify.error('El alumno no tiene celular registrado')
    window.open(url, '_blank', 'noopener')
  }

  return (
    <>
      <div className="kpis">
        <Kpi label="Alumnos activos" value={num(D.active_students)} sub={`${D.total_students} registrados`} />
        <Kpi label="Alumnos nuevos este mes" value={num(D.new_students[c])} sub={`${num(D.new_students[p])} el mes anterior`} />
        <Kpi label="Pagos por vencer / vencidos" value={`${dist.DUE_SOON} / ${dist.OVERDUE}`} sub={pend ? `${pend} alumno(s) requieren gestión` : 'Todo al día'} />
        <Kpi label="Pagos vigentes" value={num(dist.CURRENT)} sub="Alumnos activos al día" />
      </div>

      <div className="card bday" style={{ marginBottom: 16 }}>
        <span className="confetti" aria-hidden>🎉</span>
        <span className="confetti c2" aria-hidden>🎈</span>
        <span className="confetti c3" aria-hidden>✨</span>
        <h2><span className="cake">🎂</span> Cumpleaños de hoy</h2>
        <p className="sub">Alumnos activos que cumplen años el {fmtDate(D.today)}</p>
        {D.birthdays_today.length ? (
          <div className="bdl">
            {D.birthdays_today.map((b) => (
              <div className="bdi" key={b.id}>
                <span className="bdi-e">🥳</span>
                <div><b>{b.full_name}</b><br /><span className="sm">{b.rut}</span></div>
                <span className="bdi-a">🎁 Cumple <b>{b.age}</b> años</span>
              </div>
            ))}
          </div>
        ) : <Empty>🎈 Hoy no hay alumnos de cumpleaños</Empty>}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2>🎁 Cumpleaños de la semana que viene</h2>
        <p className="sub">Alumnos activos que cumplen años en los próximos 7 días</p>
        {D.birthdays_next.length ? (
          <div className="bdl">
            {D.birthdays_next.map((b) => (
              <div className="bdi" key={b.id}>
                <span className="bdi-e" style={{ animation: 'none' }}>🎂</span>
                <div><b>{b.full_name}</b><br /><span className="sm">{b.rut}</span></div>
                <span className="bdi-a">{b.days === 1 ? 'Mañana' : WEEKDAYS[b.weekday]} · {fmtDate(b.date)} · cumple <b>{b.turning}</b> años</span>
              </div>
            ))}
          </div>
        ) : <Empty>No hay cumpleaños en los próximos 7 días</Empty>}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2>Pagos por gestionar</h2>
        <p className="sub">Alumnos activos con pago vencido o por vencer, ordenados por fecha de vencimiento</p>
        <DataGrid<StudentSummary>
          rows={D.pending}
          pageSize={8}
          empty="Sin pagos vencidos ni por vencer 🎉"
          cols={[
            { h: 'Alumno', cell: (a) => <><b>{a.full_name}</b><br /><span className="muted sm">{a.rut}</span></> },
            { h: 'Fecha de pago', cell: (a) => fmtDate(a.last_payment!.paid_on) },
            { h: 'Fecha de vencimiento', cell: (a) => fmtDate(a.last_payment!.due_date) },
            { h: 'Plan · Monto', cell: (a) => `${planLabel(a.last_payment!)} · ${money(a.last_payment!.amount)}` },
            {
              h: 'Estado de pago',
              cell: (a) => (
                <>
                  <PaymentPill status={a.payment_status} />
                  {a.payment_status.days_overdue ? <><br /><span className="sm muted">{a.payment_status.days_overdue} día(s) de retraso</span></> : null}
                </>
              ),
            },
            { h: 'Pago', cls: 'c', cell: (a) => <div className="acts"><button className="btn primary sm ico" title="Registrar pago" onClick={() => setPaying(a)}><CreditCard /></button></div> },
            {
              h: 'WhatsApp', cls: 'c',
              cell: (a) => (
                <div className="acts">
                  <button className="btn sm ico" style={{ background: '#25D366', borderColor: '#25D366', color: '#fff' }} title="Enviar WhatsApp" onClick={() => whatsapp(a)}><MessageCircle /></button>
                </div>
              ),
            },
          ]}
        />
      </div>

      <div className="grid2">
        <div className="card">
          <h2>Estado de pago de alumnos activos</h2>
          <p className="sub">Según último pago registrado</p>
          {D.active_students ? (
            <Donut
              center={String(D.active_students)}
              centerSub="activos"
              slices={[
                { label: 'Vigente', value: dist.CURRENT, color: 'hsl(var(--success))', icon: '✓' },
                { label: 'Por vencer', value: dist.DUE_SOON, color: 'hsl(var(--warning))', icon: '!' },
                { label: 'Vencido', value: dist.OVERDUE, color: 'hsl(var(--destructive))', icon: '✕' },
                { label: 'Sin pagos', value: dist.NONE, color: 'hsl(var(--muted-foreground))', icon: '–' },
              ]}
            />
          ) : <Empty>Sin alumnos activos</Empty>}
        </div>
        <div className="card">
          <h2>Alumnos activos por categoría</h2>
          <p className="sub">Según sexo y peso</p>
          <HBars data={D.active_by_category} />
        </div>
      </div>

      {paying && <PaymentModal student={paying} onClose={() => setPaying(null)} onDone={onChanged} />}
    </>
  )
}
