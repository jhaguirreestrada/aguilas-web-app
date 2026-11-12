import type { Db } from '@/server/db/client'
import { unwrap } from '@/server/db/client'
import { AppError } from '@/server/common/errors'
import type { Settings, Plan, WeightCategory } from '@/shared/types'

export class SettingsRepository {
  constructor(private readonly db: Db) {}

  async get(): Promise<Settings> {
    const [gs, pm, pl, st, pc, ec, wc] = await Promise.all([
      this.db.from('gym_settings').select('*').eq('id', 1).maybeSingle(),
      this.db.from('payment_methods').select('name').order('sort_order'),
      this.db.from('plans').select('name,unit,quantity,amount').order('sort_order'),
      this.db.from('student_statuses').select('name').order('sort_order'),
      this.db.from('product_categories').select('name').order('sort_order'),
      this.db.from('expense_categories').select('name').order('sort_order'),
      this.db.from('weight_categories').select('sex,name,min_kg,max_kg').order('sort_order'),
    ])
    const g = unwrap(gs) as any
    if (!g) throw new AppError(500, 'La configuración del sistema no está inicializada', 'SETTINGS_MISSING')
    const names = (r: any) => (unwrap(r) as { name: string }[]).map((x) => x.name)
    const cats = unwrap(wc) as (WeightCategory & { sex: 'F' | 'M' })[]
    const pick = (sex: 'F' | 'M'): WeightCategory[] =>
      cats.filter((c) => c.sex === sex).map(({ name, min_kg, max_kg }) => ({ name, min_kg: Number(min_kg), max_kg: Number(max_kg) }))

    return {
      gym_name: g.gym_name,
      warning_days: g.warning_days,
      inactivity_minutes: g.inactivity_minutes,
      whatsapp: { overdue: g.whatsapp_msg_overdue, due_soon: g.whatsapp_msg_due_soon, current: g.whatsapp_msg_current },
      payment_methods: names(pm),
      plans: (unwrap(pl) as Plan[]).map((p) => ({ ...p, quantity: Number(p.quantity), amount: Number(p.amount) })),
      student_statuses: names(st),
      product_categories: names(pc),
      expense_categories: names(ec),
      weight_categories_female: pick('F'),
      weight_categories_male: pick('M'),
    }
  }

  async replace(s: Settings): Promise<void> {
    unwrap(await this.db.rpc('replace_settings', { p_data: s }))
  }
}
