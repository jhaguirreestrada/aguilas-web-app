import type { Db } from '@/server/db/client'
import { unwrap } from '@/server/db/client'
import type { AuditLog } from '@/shared/types'

export interface AuditFilters {
  search?: string
  entity?: string
  action?: string
  actor?: string
  from?: string // ISO date (inclusive)
  to?: string // ISO date (inclusive)
}

export interface AuditEvent {
  actor_user_id: string | null
  actor_username: string
  action: string
  entity: string
  record_id?: string | null
  description?: string | null
  changes_after?: Record<string, unknown> | null
}

/** Quita caracteres con significado especial en filtros `or()`/`ilike` de PostgREST. */
export const sanitizeSearch = (s: string) => s.replace(/[,()*%\\:]/g, ' ').trim().slice(0, 80)

export class AuditRepository {
  constructor(private readonly db: Db) {}

  async list(f: AuditFilters, page: number, limit: number): Promise<{ data: AuditLog[]; total: number }> {
    let q = this.db.from('audit_log').select('*', { count: 'exact' })
    if (f.entity) q = q.eq('entity', f.entity)
    if (f.action) q = q.eq('action', f.action)
    if (f.actor) q = q.ilike('actor_username', `%${sanitizeSearch(f.actor)}%`)
    if (f.from) q = q.gte('occurred_at', `${f.from}T00:00:00`)
    if (f.to) q = q.lte('occurred_at', `${f.to}T23:59:59.999`)
    if (f.search) {
      const s = sanitizeSearch(f.search)
      if (s) q = q.or(`description.ilike.%${s}%,actor_username.ilike.%${s}%,entity.ilike.%${s}%,record_id.ilike.%${s}%`)
    }
    const from = (page - 1) * limit
    const res = await q.order('occurred_at', { ascending: false }).order('id', { ascending: false }).range(from, from + limit - 1)
    if (res.error) unwrap(res)
    return { data: (res.data ?? []) as AuditLog[], total: res.count ?? 0 }
  }

  async countSince(sinceIso: string, action?: string): Promise<number> {
    let q = this.db.from('audit_log').select('id', { count: 'exact', head: true }).gte('occurred_at', sinceIso)
    if (action) q = q.eq('action', action)
    const res = await q
    if (res.error) unwrap(res)
    return res.count ?? 0
  }

  async entities(): Promise<string[]> {
    const res = await this.db.from('audit_log').select('entity').order('entity').limit(5000)
    const rows = unwrap(res) as { entity: string }[]
    return [...new Set(rows.map((r) => r.entity))]
  }

  async insertEvent(e: AuditEvent): Promise<void> {
    unwrap(
      await this.db.from('audit_log').insert({
        actor_user_id: e.actor_user_id,
        actor_username: e.actor_username,
        action: e.action,
        entity: e.entity,
        record_id: e.record_id ?? null,
        description: e.description ?? null,
        changes_after: e.changes_after ?? null,
      }),
    )
  }
}
