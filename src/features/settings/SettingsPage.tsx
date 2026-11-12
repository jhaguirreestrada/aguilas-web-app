'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { api, errMsg } from '@/lib/api-client'
import { useFetch } from '@/hooks/useFetch'
import { useNotify } from '@/hooks/useNotify'
import { Field, PageHeader, Pill } from '@/components/gym/ui'
import { CORE_STATUSES } from '@/shared/domain/students'
import type { Plan, Settings, WeightCategory } from '@/shared/types'

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))

import { SETTINGS_SECTIONS, type SettingsSlug } from './sections'

export default function SettingsPage({ section }: { section: SettingsSlug }) {
  const notify = useNotify()
  const { data, reload, loading } = useFetch<Settings>('/api/settings')
  const [cfg, setCfg] = useState<Settings | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const meta = SETTINGS_SECTIONS.find((x) => x.slug === section)!

  useEffect(() => { if (data) setCfg(clone(data)); setErr('') }, [data, section])

  const save = async () => {
    if (!cfg) return
    setBusy(true); setErr('')
    try {
      await api.put('/api/settings', cfg)
      notify.ok('Configuración guardada'); reload()
      window.dispatchEvent(new Event('settings:updated')) // el temporizador de inactividad toma el nuevo valor
    } catch (e) {
      setErr(errMsg(e)); window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally { setBusy(false) }
  }

  const cancel = () => {
    if (data) setCfg(clone(data))
    setErr('')
  }

  if (loading || !cfg) return <div className="gym"><div className="empty">Cargando…</div></div>
  const up = (p: Partial<Settings>) => setCfg({ ...cfg, ...p })

  return (
    <div className="gym">
      <PageHeader title={`Configuración · ${meta.label}`} subtitle={meta.sub} />
      {err && <p className="err" style={{ margin: '-8px 0 12px' }}>{err}</p>}

      <div style={{ maxWidth: 900 }}>
        {section === 'general' && (
          <>
            <div className="card">
              <h2>Parámetros generales</h2>
              <div className="fg" style={{ marginTop: 10 }}>
                <Field label="Nombre del gimnasio"><input maxLength={80} value={cfg.gym_name} onChange={(e) => up({ gym_name: e.target.value })} /></Field>
                <Field label="Días de advertencia de vencimiento"><input type="number" min={0} max={60} value={cfg.warning_days} onChange={(e) => up({ warning_days: Number(e.target.value) })} /></Field>
                <Field label="Tiempo de inactividad para cerrar sesión (minutos)"><input type="number" min={1} max={480} step={1} value={cfg.inactivity_minutes} onChange={(e) => up({ inactivity_minutes: Number(e.target.value) })} /></Field>
              </div>
              <p className="muted sm" style={{ marginTop: 8 }}>Si no hay actividad durante este tiempo, la sesión se cierra automáticamente. Antes se muestra un aviso con cuenta regresiva para extenderla.</p>
              <p className="muted sm" style={{ marginTop: 8 }}>Un pago pasa a «Por Vencer» cuando faltan estos días o menos para su fecha de vencimiento.</p>
            </div>
            <div className="card">
              <h2>Mensajes de WhatsApp</h2>
              <p className="sub">Variables disponibles: {'{nombre}'}, {'{gimnasio}'}, {'{vencimiento}'}, {'{dias}'} (días restantes), {'{retraso}'} (días de retraso), {'{monto}'}</p>
              <div className="fg" style={{ marginTop: 10 }}>
                <Field label="Pago vencido" className="w"><textarea maxLength={500} rows={4} value={cfg.whatsapp.overdue} onChange={(e) => up({ whatsapp: { ...cfg.whatsapp, overdue: e.target.value } })} /></Field>
                <Field label="Pago por vencer" className="w"><textarea maxLength={500} rows={4} value={cfg.whatsapp.due_soon} onChange={(e) => up({ whatsapp: { ...cfg.whatsapp, due_soon: e.target.value } })} /></Field>
                <Field label="Pago vigente (saludo)" className="w"><textarea maxLength={500} rows={3} value={cfg.whatsapp.current} onChange={(e) => up({ whatsapp: { ...cfg.whatsapp, current: e.target.value } })} /></Field>
              </div>
            </div>
          </>
        )}
        {section === 'tipos-de-pago' && <StringList title={meta.title} sub={meta.sub} items={cfg.payment_methods} onChange={(v) => up({ payment_methods: v })} />}
        {section === 'planes' && <PlanList items={cfg.plans} onChange={(v) => up({ plans: v })} />}
        {section === 'estados-de-alumno' && <StringList title={meta.title} sub={meta.sub} items={cfg.student_statuses} core={[...CORE_STATUSES]} onChange={(v) => up({ student_statuses: v })} />}
        {section === 'categorias-de-producto' && <StringList title={meta.title} sub={meta.sub} items={cfg.product_categories} onChange={(v) => up({ product_categories: v })} />}
        {section === 'tipos-de-egreso' && <StringList title={meta.title} sub={meta.sub} items={cfg.expense_categories} onChange={(v) => up({ expense_categories: v })} />}
        {section === 'categorias-mujer' && <WeightList title={meta.title} items={cfg.weight_categories_female} onChange={(v) => up({ weight_categories_female: v })} />}
        {section === 'categorias-hombre' && <WeightList title={meta.title} items={cfg.weight_categories_male} onChange={(v) => up({ weight_categories_male: v })} />}
      </div>

      <div className="md-f" style={{ maxWidth: 900, padding: '14px 0 0' }}>
        <button className="btn secondary" onClick={cancel} disabled={busy}>Cancelar</button>
        <button className="btn primary" onClick={save} disabled={busy}>Guardar</button>
      </div>
    </div>
  )
}

const Del = ({ onClick }: { onClick: () => void }) => <button className="btn ghost ico sm" title="Quitar" onClick={onClick}><Trash2 /></button>
const replaceAt = <T,>(arr: T[], i: number, v: T) => arr.map((x, j) => (j === i ? v : x))

function StringList({ title, sub, items, core, onChange }: { title: string; sub: string; items: string[]; core?: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="card">
      <h2>{title}</h2><p className="sub">{sub}</p>
      {items.map((it, i) => {
        const isCore = core?.includes(it)
        return (
          <div className="chiprow" key={i}>
            <input value={it} readOnly={isCore} maxLength={40} onChange={(e) => onChange(replaceAt(items, i, e.target.value))} />
            {isCore ? <Pill tone="info">Sistema</Pill> : <Del onClick={() => onChange(items.filter((_, j) => j !== i))} />}
          </div>
        )
      })}
      <button className="btn secondary sm" onClick={() => onChange([...items, ''])}><Plus /> Agregar</button>
    </div>
  )
}

function PlanList({ items, onChange }: { items: Plan[]; onChange: (v: Plan[]) => void }) {
  const set = (i: number, p: Partial<Plan>) => onChange(replaceAt(items, i, { ...items[i], ...p }))
  return (
    <div className="card">
      <h2>Planes</h2><p className="sub">Nombre, duración (meses o días) y monto sugerido</p>
      {items.map((p, i) => (
        <div className="chiprow" key={i}>
          <input value={p.name} maxLength={40} placeholder="Nombre del plan" title="Nombre del plan" onChange={(e) => set(i, { name: e.target.value })} />
          <input type="number" min={1} max={365} step={1} value={p.quantity} style={{ maxWidth: 80 }} title="Duración" onChange={(e) => set(i, { quantity: Number(e.target.value) })} />
          <select value={p.unit} style={{ maxWidth: 100 }} title="Unidad" onChange={(e) => set(i, { unit: e.target.value as Plan['unit'] })}><option value="months">meses</option><option value="days">días</option></select>
          <input type="number" min={0} step={1} value={p.amount} title="Monto sugerido" onChange={(e) => set(i, { amount: Number(e.target.value) })} />
          <span className="muted sm">CLP</span>
          <Del onClick={() => onChange(items.filter((_, j) => j !== i))} />
        </div>
      ))}
      <button className="btn secondary sm" onClick={() => onChange([...items, { name: '', unit: 'months', quantity: 1, amount: 0 }])}><Plus /> Agregar</button>
    </div>
  )
}

function WeightList({ title, items, onChange }: { title: string; items: WeightCategory[]; onChange: (v: WeightCategory[]) => void }) {
  const set = (i: number, p: Partial<WeightCategory>) => onChange(replaceAt(items, i, { ...items[i], ...p }))
  return (
    <div className="card">
      <h2>{title}</h2><p className="sub">Se asignan según el peso</p>
      <div className="chiprow muted sm" style={{ marginBottom: 2 }}><span style={{ flex: 1 }}>Nombre</span><span style={{ width: 100 }}>Mín. kg</span><span style={{ width: 100, marginRight: 36 }}>Máx. kg</span></div>
      {items.map((c, i) => (
        <div className="chiprow" key={i}>
          <input value={c.name} maxLength={30} onChange={(e) => set(i, { name: e.target.value })} />
          <input type="number" min={0} step={0.01} value={c.min_kg} style={{ maxWidth: 100 }} title="Peso mínimo" onChange={(e) => set(i, { min_kg: Number(e.target.value) })} />
          <input type="number" min={0} step={0.01} value={c.max_kg} style={{ maxWidth: 100 }} title="Peso máximo" onChange={(e) => set(i, { max_kg: Number(e.target.value) })} />
          <Del onClick={() => onChange(items.filter((_, j) => j !== i))} />
        </div>
      ))}
      <button className="btn secondary sm" onClick={() => onChange([...items, { name: '', min_kg: 0, max_kg: 0 }])}><Plus /> Agregar</button>
    </div>
  )
}
