'use client'

import { useState } from 'react'
import { CreditCard, TrendingUp, Users, Wallet } from 'lucide-react'
import { useFetch } from '@/hooks/useFetch'
import { Field, PageHeader, Tabs } from '@/components/gym/ui'
import { TipArea } from '@/components/gym/charts'
import { StudentsTab } from './StudentsTab'
import { IncomeTab } from './IncomeTab'
import { ExpensesTab } from './ExpensesTab'
import { ProjectionTab } from './ProjectionTab'
import type { DashboardData, ProjectionMethod } from '@/shared/dashboard'

type Tab = 'students' | 'income' | 'expenses' | 'projection'

const METHODS: { value: ProjectionMethod; label: string }[] = [
  { value: 'pond', label: 'Promedio ponderado (3 meses)' },
  { value: 'prom3', label: 'Promedio simple (3 meses)' },
  { value: 'tend', label: 'Tendencia lineal' },
]

export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>('students')
  const [range, setRange] = useState(6)
  const [method, setMethod] = useState<ProjectionMethod>('pond')

  // la proyección siempre usa 12 meses de historial
  const url = tab === 'projection' ? `/api/dashboard?months=12&projection=${method}` : `/api/dashboard?months=${range}`
  const { data: D, error, reload } = useFetch<DashboardData>(url)

  return (
    <div className="gym">
      <PageHeader
        title="Paneles"
        actions={
          <>
            {tab === 'projection' && (
              <div style={{ minWidth: 230 }}>
                <Field label="Método de proyección">
                  <select value={method} onChange={(e) => setMethod(e.target.value as ProjectionMethod)}>
                    {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </Field>
              </div>
            )}
            {(tab === 'income' || tab === 'expenses') && (
              <div style={{ minWidth: 170 }}>
                <Field label="Período de gráficos">
                  <select value={range} onChange={(e) => setRange(Number(e.target.value))}>
                    <option value={6}>Últimos 6 meses</option>
                    <option value={12}>Últimos 12 meses</option>
                  </select>
                </Field>
              </div>
            )}
          </>
        }
      />
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'students', label: 'Alumnos', icon: <Users /> },
          { key: 'income', label: 'Ingresos', icon: <CreditCard /> },
          { key: 'expenses', label: 'Egresos', icon: <Wallet /> },
          { key: 'projection', label: 'Proyección y Planificación', icon: <TrendingUp /> },
        ]}
      />

      {error ? (
        <div className="card"><p className="err">{error}</p></div>
      ) : !D ? (
        <div className="empty">Cargando…</div>
      ) : (
        <TipArea>
          {tab === 'students' && <StudentsTab D={D} onChanged={reload} />}
          {tab === 'income' && <IncomeTab D={D} />}
          {tab === 'expenses' && <ExpensesTab D={D} />}
          {tab === 'projection' && D.projection && <ProjectionTab D={D} />}
        </TipArea>
      )}
    </div>
  )
}
