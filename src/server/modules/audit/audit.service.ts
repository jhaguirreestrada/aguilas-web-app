import { z } from 'zod'
import { AuditRepository, type AuditEvent } from './audit.repository'
import { todayIso } from '@/shared/dates'
import { env } from '@/server/config/env'
import type { AuditStats, Paginated, AuditLog } from '@/shared/types'

export const auditQuerySchema = z.object({
  search: z.string().optional(),
  entity: z.string().optional(),
  action: z.string().optional(),
  actor: z.string().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(15),
})
export type AuditQuery = z.infer<typeof auditQuerySchema>

export class AuditService {
  constructor(private readonly repo: AuditRepository) {}

  async list(q: AuditQuery): Promise<Paginated<AuditLog>> {
    const { data, total } = await this.repo.list(
      { search: q.search, entity: q.entity, action: q.action, actor: q.actor, from: q.from || undefined, to: q.to || undefined },
      q.page,
      q.limit,
    )
    return { data, total, page: q.page, limit: q.limit }
  }

  async stats(): Promise<AuditStats> {
    const today = todayIso(env().APP_TIMEZONE)
    const monthStart = `${today.slice(0, 7)}-01`
    const since = (d: string) => `${d}T00:00:00`
    const [events_today, events_month, logins_today, deletes_today] = await Promise.all([
      this.repo.countSince(since(today)),
      this.repo.countSince(since(monthStart)),
      this.repo.countSince(since(today), 'LOGIN'),
      this.repo.countSince(since(today), 'DELETE'),
    ])
    return { events_today, events_month, logins_today, deletes_today }
  }

  entities() {
    return this.repo.entities()
  }

  /** Eventos que no nacen de un trigger (inicio/cierre de sesión). */
  record(event: AuditEvent) {
    return this.repo.insertEvent(event)
  }
}

