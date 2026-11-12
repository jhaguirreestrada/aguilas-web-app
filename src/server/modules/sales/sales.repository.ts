import type { Db } from '@/server/db/client'
import { unwrap } from '@/server/db/client'
import type { Sale } from '@/shared/types'
import type { SalesQuery } from './sales.dto'

const WITH_ITEMS = '*, items:sale_items(*)'

export class SalesRepository {
  constructor(private readonly db: Db) {}

  async list(f: SalesQuery): Promise<Sale[]> {
    let q = this.db.from('sales').select(WITH_ITEMS)
    if (f.from) q = q.gte('sold_on', f.from)
    if (f.to) q = q.lte('sold_on', f.to)
    if (f.payment_method) q = q.eq('payment_method', f.payment_method)
    if (f.status) q = q.eq('status', f.status)
    return unwrap(await q.order('sale_number', { ascending: false }).limit(2000)) as Sale[]
  }

  async get(id: string): Promise<Sale | null> {
    return unwrap(await this.db.from('sales').select(WITH_ITEMS).eq('id', id).maybeSingle()) as Sale | null
  }

  async register(a: {
    items: unknown[]; payment_method: string; student_id: string | null; notes: string; sold_on: string; sold_time: string
  }): Promise<{ id: string }> {
    return unwrap(
      await this.db.rpc('register_sale', {
        p_items: a.items, p_payment_method: a.payment_method, p_student_id: a.student_id,
        p_notes: a.notes, p_sold_on: a.sold_on, p_sold_time: a.sold_time,
      }),
    ) as { id: string }
  }

  async void(id: string, on: string): Promise<void> {
    unwrap(await this.db.rpc('void_sale', { p_sale_id: id, p_on: on }))
  }
}
