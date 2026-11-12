import { z } from 'zod'
import type { Db } from '@/server/db/client'
import { unwrap } from '@/server/db/client'
import { badRequest } from '@/server/common/errors'
import { SettingsRepository } from '../settings/settings.repository'
import { settingsSchema } from '../settings/settings.dto'
import {
  BACKUP_APP_ID, COLLECTIONS, COLLECTION_LABEL, detectCollection, isV2,
  legacyActivities, legacyExpenses, legacyMovements, legacyPayments, legacyProducts, legacySales, legacySettings, legacyStudents,
  type Collection, type IdMaps, type MapResult,
} from './backup.mapper'

/* eslint-disable @typescript-eslint/no-explicit-any */
export const importSchema = z.object({
  files: z.array(z.object({ name: z.string().max(200), content: z.unknown() })).min(1, 'Selecciona al menos un archivo').max(20),
  dry_run: z.boolean().default(false),
})

export interface ImportPlanItem { collection: Collection; label: string; current: number; incoming: number }
export interface ImportPlan { items: ImportPlanItem[]; problems: string[]; warnings: string[] }

const TABLE_OF: Record<Exclude<Collection, 'settings'>, string> = {
  students: 'students', payments: 'payments', products: 'products', inventory_movements: 'inventory_movements',
  sales: 'sales', expenses: 'expenses', activities: 'activities',
}

export class BackupService {
  constructor(
    private readonly db: Db,
    private readonly settings: SettingsRepository,
  ) {}

  // ---------------------------------------------------------------- conteos / exportación
  async counts(): Promise<Record<Collection, number>> {
    const out = { settings: 1 } as Record<Collection, number>
    await Promise.all(
      (Object.keys(TABLE_OF) as (keyof typeof TABLE_OF)[]).map(async (c) => {
        const res = await this.db.from(TABLE_OF[c]).select('id', { count: 'exact', head: true })
        if (res.error) unwrap(res)
        out[c] = res.count ?? 0
      }),
    )
    return out
  }

  async exportCollection(c: Collection): Promise<unknown> {
    if (c === 'settings') return this.settings.get()
    if (c === 'students') {
      const [s, w] = await Promise.all([
        this.db.from('students').select('*').order('created_at'),
        this.db.from('student_weight_history').select('*').order('recorded_at'),
      ])
      const hist = new Map<string, any[]>()
      for (const h of unwrap(w) as any[]) (hist.get(h.student_id) ?? hist.set(h.student_id, []).get(h.student_id)!).push(h)
      return (unwrap(s) as any[]).map((r) => ({ ...r, weight_history: (hist.get(r.id) ?? []).map(({ weight_kg, recorded_at }) => ({ weight_kg, recorded_at })) }))
    }
    if (c === 'sales') return unwrap(await this.db.from('sales').select('*, items:sale_items(*)').order('sale_number'))
    return unwrap(await this.db.from(TABLE_OF[c]).select('*').order('created_at'))
  }

  async exportAll() {
    const data: Record<string, unknown> = {}
    for (const c of COLLECTIONS) data[c] = await this.exportCollection(c)
    return { app: BACKUP_APP_ID, version: 2, exported_at: new Date().toISOString(), data }
  }

  // ---------------------------------------------------------------- importación
  /** Interpreta los archivos y arma la carga para `import_backup`. Con `dry_run` solo devuelve el plan. */
  async import(input: z.infer<typeof importSchema>): Promise<ImportPlan & { imported?: Record<string, number> }> {
    const problems: string[] = []
    const found: Partial<Record<Collection, unknown>> = {}

    for (const f of input.files) {
      const j: any = f.content
      if (j && typeof j === 'object' && !Array.isArray(j) && j.app === BACKUP_APP_ID && j.data && typeof j.data === 'object') {
        // Respaldo completo (v1 español o v2 inglés)
        const keys = Object.keys(j.data)
        for (const k of keys) {
          const c = detectCollection(k, j.data[k]) ?? null
          if (c) found[c] = j.data[k]
        }
        continue
      }
      const c = detectCollection(f.name, j)
      if (!c) { problems.push(`${f.name}: no se reconoce el mantenedor`); continue }
      found[c] = j
    }

    const keys = Object.keys(found) as Collection[]
    if (!keys.length) throw badRequest(problems[0] ?? 'No se encontraron datos para importar')

    // Validación de forma
    for (const c of keys) {
      const d: any = found[c]
      if (c === 'settings') {
        if (!d || Array.isArray(d) || typeof d !== 'object') { problems.push('Configuración: formato inválido'); delete found[c] }
      } else if (!Array.isArray(d) || d.some((r: any) => !r || typeof r !== 'object')) {
        problems.push(`${COLLECTION_LABEL[c]}: debe ser una lista de registros`)
        delete found[c]
      }
    }

    const { payload, warnings, mapProblems } = await this.buildPayload(found)
    problems.push(...mapProblems)

    const counts = await this.counts()
    const items: ImportPlanItem[] = (Object.keys(found) as Collection[]).map((c) => ({
      collection: c,
      label: COLLECTION_LABEL[c],
      current: counts[c],
      incoming: c === 'settings' ? 1 : (payload[c] as any[]).length,
    }))
    if (!items.length) throw badRequest(problems[0] ?? 'No se encontraron datos para importar')

    const plan: ImportPlan = { items, problems, warnings }
    if (input.dry_run) return plan

    const imported = unwrap(await this.db.rpc('import_backup', { p_payload: payload })) as Record<string, number>
    return { ...plan, imported }
  }

  private async buildPayload(found: Partial<Record<Collection, unknown>>) {
    const payload: Record<string, any> = {}
    const warnings: string[] = []
    const mapProblems: string[] = []
    const maps: IdMaps = { students: new Map(), products: new Map() }
    const take = (c: Collection, build: (rows: any[]) => MapResult, v2?: (rows: any[]) => any[]) => {
      const raw = found[c] as any[] | undefined
      if (!raw) return
      if (isV2(c, raw)) {
        payload[c] = v2 ? v2(raw) : raw
        return
      }
      const r = build(raw)
      payload[c] = r.rows
      for (const [t, rows] of Object.entries(r.extra ?? {})) payload[t] = rows
      mapProblems.push(...r.problems)
    }

    // v2: los hijos vienen anidados (weight_history, items): se separan en su tabla.
    take('students', (r) => legacyStudents(r, maps), (rows) => {
      const hist: any[] = []
      const out = rows.map(({ weight_history, ...s }) => {
        for (const h of weight_history ?? []) hist.push({ id: crypto.randomUUID(), student_id: s.id, weight_kg: h.weight_kg, recorded_at: h.recorded_at })
        return s
      })
      payload.student_weight_history = hist
      return out
    })
    take('products', (r) => legacyProducts(r, maps))
    take('payments', (r) => legacyPayments(r, maps))
    take('inventory_movements', (r) => legacyMovements(r, maps))
    take('sales', (r) => legacySales(r, maps), (rows) => {
      const items: any[] = []
      const out = rows.map(({ items: it, ...s }) => {
        for (const i of it ?? []) items.push({ ...i, sale_id: s.id })
        return s
      })
      payload.sale_items = items
      return out
    })
    take('expenses', (r) => legacyExpenses(r))
    take('activities', (r) => legacyActivities(r))

    if (found.settings) {
      const base = await this.settings.get()
      const candidate = isV2('settings', found.settings) ? { ...base, ...(found.settings as object) } : legacySettings(found.settings as any, base)
      const parsed = settingsSchema.safeParse(candidate)
      if (!parsed.success) {
        mapProblems.push(`Configuración: ${parsed.error.issues[0]?.message ?? 'datos inválidos'}`)
        delete found.settings
      } else {
        payload.settings = parsed.data
      }
    }

    if (payload.students && !payload.payments)
      warnings.push('Al reemplazar los alumnos se eliminan también sus pagos actuales (no incluiste pagos en la importación).')
    if (payload.products && !payload.inventory_movements)
      warnings.push('Al reemplazar los productos se elimina también su historial de movimientos actual.')
    if (payload.products && !payload.sales)
      warnings.push('Las ventas existentes conservan su detalle, pero pierden el vínculo con los productos reemplazados.')

    return { payload, warnings, mapProblems }
  }

  async reset(): Promise<void> {
    unwrap(await this.db.rpc('reset_data'))
  }
}
