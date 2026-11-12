import { z } from 'zod'
import type { Db } from '@/server/db/client'
import { unwrap } from '@/server/db/client'
import { badRequest, notFound } from '@/server/common/errors'
import { env } from '@/server/config/env'
import { todayIso } from '@/shared/dates'
import type { Activity, ActivityStatus } from '@/shared/types'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ingresa la fecha de inicio y la fecha de fin')

export const activitySchema = z.object({
  name: z.string().trim().min(1, 'El nombre de la actividad es obligatorio').max(120),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  status: z.enum(['pending', 'in_progress', 'done', 'dropped']).default('pending'),
  start_date: isoDate,
  end_date: isoDate,
  notes: z.string().trim().max(400).default(''),
})
export type ActivityDto = z.infer<typeof activitySchema>

export const transitionSchema = z.object({ to: z.enum(['pending', 'in_progress', 'done', 'dropped']) })

const closed = (s: ActivityStatus) => s === 'done' || s === 'dropped'

export class ActivitiesRepository {
  constructor(private readonly db: Db) {}

  async listAll(): Promise<Activity[]> {
    return unwrap(await this.db.from('activities').select('*').order('end_date')) as Activity[]
  }
  async findById(id: string): Promise<Activity | null> {
    return unwrap(await this.db.from('activities').select('*').eq('id', id).maybeSingle()) as Activity | null
  }
  async insert(row: Omit<Activity, 'id'>): Promise<Activity> {
    return unwrap(await this.db.from('activities').insert(row).select('*').single()) as Activity
  }
  async update(id: string, row: Partial<Activity>): Promise<Activity> {
    return unwrap(await this.db.from('activities').update(row).eq('id', id).select('*').single()) as Activity
  }
  async remove(id: string): Promise<void> {
    unwrap(await this.db.from('activities').delete().eq('id', id))
  }
}

export class ActivitiesService {
  constructor(private readonly repo: ActivitiesRepository) {}

  list() {
    return this.repo.listAll()
  }

  async create(dto: ActivityDto): Promise<Activity> {
    this.checkDates(dto)
    return this.repo.insert({ ...dto, closed_on: closed(dto.status) ? this.today() : null })
  }

  async update(id: string, dto: ActivityDto): Promise<Activity> {
    const current = await this.require(id)
    this.checkDates(dto)
    return this.repo.update(id, { ...dto, closed_on: closed(dto.status) ? current.closed_on ?? this.today() : null })
  }

  /** Iniciar / terminar / dar de baja / reabrir. */
  async transition(id: string, to: ActivityStatus): Promise<Activity> {
    await this.require(id)
    return this.repo.update(id, { status: to, closed_on: closed(to) ? this.today() : null })
  }

  async remove(id: string): Promise<void> {
    await this.require(id)
    await this.repo.remove(id)
  }

  private async require(id: string) {
    const a = await this.repo.findById(id)
    if (!a) throw notFound('Actividad no encontrada')
    return a
  }
  private checkDates(d: { start_date: string; end_date: string }) {
    if (d.end_date < d.start_date) throw badRequest('La fecha de fin no puede ser anterior a la de inicio')
  }
  private today() {
    return todayIso(env().APP_TIMEZONE)
  }
}
