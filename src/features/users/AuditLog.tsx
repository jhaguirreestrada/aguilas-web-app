'use client'

import { useEffect, useMemo, useState } from 'react'
import { Activity, Eye, KeyRound, ListFilter, LogIn, LogOut, Pencil, Plus, RotateCcw, Search, ShieldAlert, Trash2, Upload, X } from 'lucide-react'
import { qs } from '@/lib/api-client'
import { useFetch } from '@/hooks/useFetch'
import { useDebounced } from '@/hooks/useDebounced'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { FormModal } from '@/components/ui/FormModal'
import { Pagination } from '@/components/ui/Pagination'
import { countChanges, diffJson, resolveLineStatus, serializeWithPaths, type LineStatus } from '@/lib/json-diff'
import { fmtDateTime } from '@/shared/format'
import { ACTION_LABEL, ENTITY_LABEL, entityLabel } from './labels'
import type { AuditLog as AuditEntry, AuditStats, Paginated } from '@/shared/types'

const LIMIT = 15

const ACTION_STYLE: Record<string, { cls: string; icon: React.ReactNode }> = {
  CREATE: { cls: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30', icon: <Plus className="w-3 h-3 stroke-[3]" /> },
  UPDATE: { cls: 'bg-amber-500/15 text-amber-500 border-amber-500/30', icon: <Pencil className="w-3 h-3 stroke-[2.5]" /> },
  DELETE: { cls: 'bg-rose-500/15 text-rose-500 border-rose-500/30', icon: <Trash2 className="w-3 h-3 stroke-[2.5]" /> },
  LOGIN: { cls: 'bg-cyan-500/15 text-cyan-500 border-cyan-500/30', icon: <LogIn className="w-3 h-3 stroke-[2.5]" /> },
  LOGIN_FAILED: { cls: 'bg-rose-500/15 text-rose-500 border-rose-500/30', icon: <ShieldAlert className="w-3 h-3 stroke-[2.5]" /> },
  LOGOUT: { cls: 'bg-slate-500/15 text-muted-foreground border-slate-500/30', icon: <LogOut className="w-3 h-3 stroke-[2.5]" /> },
  IMPORT: { cls: 'bg-violet-500/15 text-violet-500 border-violet-500/30', icon: <Upload className="w-3 h-3 stroke-[2.5]" /> },
  RESET: { cls: 'bg-rose-500/15 text-rose-500 border-rose-500/30', icon: <RotateCcw className="w-3 h-3 stroke-[2.5]" /> },
}
export function ActionBadge({ action }: { action: string }) {
  const s = ACTION_STYLE[action] ?? { cls: 'bg-slate-500/15 text-muted-foreground border-slate-500/30', icon: <Activity className="w-3 h-3" /> }
  return <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border whitespace-nowrap ${s.cls}`}>{s.icon}{action}</span>
}

export function AuditLog() {
  const [f, setF] = useState({ search: '', entity: '', action: '', actor: '', from: '', to: '' })
  const dSearch = useDebounced(f.search, 300)
  const dActor = useDebounced(f.actor, 300)
  const [page, setPage] = useState(1)
  const url = `/api/audit-logs${qs({ search: dSearch, entity: f.entity, action: f.action, actor: dActor, from: f.from, to: f.to, page, limit: LIMIT })}`
  const { data, loading, error } = useFetch<Paginated<AuditEntry>>(url)
  const { data: stats } = useFetch<AuditStats>('/api/audit-logs/stats')
  const { data: entities } = useFetch<string[]>('/api/audit-logs/entities')
  const [detail, setDetail] = useState<AuditEntry | null>(null)

  useEffect(() => setPage(1), [dSearch, dActor, f.entity, f.action, f.from, f.to])
  const set = (p: Partial<typeof f>) => setF((c) => ({ ...c, ...p }))
  const dirty = Object.values(f).some(Boolean)

  const cards = [
    { label: 'Eventos hoy', value: stats?.events_today, icon: <Activity className="w-4 h-4" />, tone: 'text-primary' },
    { label: 'Eventos del mes', value: stats?.events_month, icon: <ListFilter className="w-4 h-4" />, tone: 'text-action' },
    { label: 'Inicios de sesión hoy', value: stats?.logins_today, icon: <KeyRound className="w-4 h-4" />, tone: 'text-cyan-500' },
    { label: 'Eliminaciones hoy', value: stats?.deletes_today, icon: <Trash2 className="w-4 h-4" />, tone: 'text-destructive' },
  ]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-card/80 backdrop-blur-xl border border-border/80 rounded-2xl p-4 shadow-sm">
            <div className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider ${c.tone}`}>{c.icon}<span className="text-muted-foreground">{c.label}</span></div>
            <p className="text-3xl font-extrabold text-foreground mt-1">{c.value ?? '…'}</p>
          </div>
        ))}
      </div>

      <div className="bg-card/80 backdrop-blur-xl border border-border/80 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
          <div className="lg:col-span-2"><Input label="Buscar" icon={Search} placeholder="Descripción, usuario, registro…" value={f.search} onChange={(e) => set({ search: e.target.value })} /></div>
          <Select label="Entidad" value={f.entity} onChange={(e) => set({ entity: e.target.value })}>
            <option value="">Todas</option>
            {(entities ?? Object.keys(ENTITY_LABEL)).map((e) => <option key={e} value={e}>{entityLabel(e)}</option>)}
          </Select>
          <Select label="Acción" value={f.action} onChange={(e) => set({ action: e.target.value })}>
            <option value="">Todas</option>
            {Object.entries(ACTION_LABEL).map(([k, v]) => <option key={k} value={k}>{k} · {v}</option>)}
          </Select>
          <Input label="Usuario" placeholder="Ej: admin" value={f.actor} onChange={(e) => set({ actor: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <Input label="Desde" type="date" value={f.from} onChange={(e) => set({ from: e.target.value })} />
            <Input label="Hasta" type="date" value={f.to} onChange={(e) => set({ to: e.target.value })} />
          </div>
        </div>
        {dirty && (
          <div className="mt-3"><button onClick={() => setF({ search: '', entity: '', action: '', actor: '', from: '', to: '' })} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /> Limpiar filtros</button></div>
        )}
      </div>

      <div className="bg-card/80 backdrop-blur-xl border border-border/80 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="bg-secondary/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                {['Fecha y hora', 'Usuario', 'Acción', 'Entidad', 'Descripción', 'Detalle'].map((h, i) => <th key={h} className={`px-4 py-3 font-bold ${i === 5 ? 'text-center' : 'text-left'}`}>{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {error ? <tr><td colSpan={6} className="px-4 py-10 text-center text-destructive">{error}</td></tr>
                : loading && !data ? <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Cargando…</td></tr>
                : (data?.data.length ?? 0) === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No hay eventos que coincidan con los filtros</td></tr>
                : data!.data.map((l) => (
                  <tr key={l.id} className="hover:bg-accent/40 transition-colors">
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDateTime(l.occurred_at)}</td>
                    <td className="px-4 py-3 font-mono text-xs font-bold text-foreground">@{l.actor_username}</td>
                    <td className="px-4 py-3"><ActionBadge action={l.action} /></td>
                    <td className="px-4 py-3 text-xs"><span className="font-semibold text-foreground">{entityLabel(l.entity)}</span></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[320px] truncate" title={l.description ?? ''}>{l.description || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <button title="Ver detalle" onClick={() => setDetail(l)} className="p-2 rounded-xl border border-border bg-secondary hover:bg-accent text-foreground transition-colors"><Eye className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-border"><Pagination page={page} limit={LIMIT} total={data?.total ?? 0} onPage={setPage} /></div>
      </div>

      {detail && <AuditDetail log={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}

/* ------------------------------ Detalle con diff antes/después ------------------------------ */
const LINE_CLS: Record<LineStatus, string> = {
  added: 'bg-emerald-500/15 text-emerald-400',
  removed: 'bg-rose-500/15 text-rose-400',
  changed: 'bg-amber-500/15 text-amber-400',
  descendant: 'text-foreground',
  unchanged: 'text-muted-foreground',
}

function JsonPane({ title, value, diff }: { title: string; value: unknown; diff: Map<string, ReturnType<typeof diffJson> extends Map<string, infer S> ? S : never> }) {
  const lines = useMemo(() => (value == null ? [] : serializeWithPaths(value)), [value])
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">{title}</p>
      <pre className="bg-background/80 border border-border rounded-xl p-3 text-[11px] leading-5 overflow-auto max-h-[46vh] font-mono">
        {value == null ? <span className="text-muted-foreground italic">— sin datos —</span> : lines.map((ln, i) => (
          <div key={i} className={`px-1 rounded-sm whitespace-pre ${LINE_CLS[resolveLineStatus(ln, diff)]}`}>{ln.text}</div>
        ))}
      </pre>
    </div>
  )
}

function AuditDetail({ log, onClose }: { log: AuditEntry; onClose: () => void }) {
  const diff = useMemo(() => diffJson(log.changes_before, log.changes_after), [log])
  const n = countChanges(diff)
  const kv: [string, React.ReactNode][] = [
    ['Fecha y hora', fmtDateTime(log.occurred_at)],
    ['Usuario', <span key="u" className="font-mono">@{log.actor_username}</span>],
    ['Acción', <ActionBadge key="a" action={log.action} />],
    ['Entidad', entityLabel(log.entity)],
    ['ID del registro', <span key="r" className="font-mono break-all">{log.record_id || '—'}</span>],
    ['Descripción', log.description || '—'],
  ]
  return (
    <FormModal open size="xl" title={`Evento #${log.id}`} subtitle={`${ACTION_LABEL[log.action] ?? log.action} · ${entityLabel(log.entity)}`} onClose={onClose}
      footer={<Button variant="secondary" className="sm:w-auto" onClick={onClose}>Cerrar</Button>}>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 pb-4">
        {kv.map(([k, v]) => (
          <div key={k}><p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{k}</p><div className="text-sm font-semibold text-foreground mt-0.5">{v}</div></div>
        ))}
      </div>
      {(log.changes_before || log.changes_after) ? (
        <div className="pb-4">
          <p className="text-xs text-muted-foreground mb-2">{log.action === 'UPDATE' ? `${n} campo(s) modificado(s) — se muestran solo las columnas que cambiaron` : log.action === 'CREATE' ? 'Valores con los que se creó el registro' : log.action === 'DELETE' ? 'Valores que tenía el registro eliminado' : 'Información adicional del evento'}</p>
          <div className={`grid gap-4 ${log.changes_before && log.changes_after ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
            {log.changes_before && <JsonPane title="Antes" value={log.changes_before} diff={diff} />}
            {log.changes_after && <JsonPane title="Después" value={log.changes_after} diff={diff} />}
          </div>
        </div>
      ) : <p className="text-sm text-muted-foreground pb-4">Este evento no tiene valores asociados.</p>}
    </FormModal>
  )
}
