import type { Db } from '@/server/db/client'
import { unwrap } from '@/server/db/client'
import { notFound } from '@/server/common/errors'
import type { ExpenseDto } from './expenses.dto'
import type { Expense } from '@/shared/types'

const COLS = 'id,year,month,expense_date,category,amount,detail,payment_method,comment'

export class ExpensesRepository {
  constructor(private readonly db: Db) {}

  async listAll(): Promise<Expense[]> {
    return unwrap(
      await this.db.from('expenses').select(COLS).order('expense_date', { ascending: false }).order('created_at', { ascending: false }),
    ) as Expense[]
  }

  async insert(dto: ExpenseDto): Promise<Expense> {
    // year/month los deriva el trigger desde expense_date
    return unwrap(await this.db.from('expenses').insert(dto).select(COLS).single()) as Expense
  }

  async update(id: string, dto: ExpenseDto): Promise<Expense | null> {
    return unwrap(await this.db.from('expenses').update(dto).eq('id', id).select(COLS).maybeSingle()) as Expense | null
  }

  async remove(id: string): Promise<boolean> {
    const rows = unwrap(await this.db.from('expenses').delete().eq('id', id).select('id')) as { id: string }[]
    return rows.length > 0
  }
}

export class ExpensesService {
  constructor(private readonly repo: ExpensesRepository) {}

  list() {
    return this.repo.listAll()
  }

  create(dto: ExpenseDto) {
    return this.repo.insert(dto)
  }

  async update(id: string, dto: ExpenseDto) {
    const row = await this.repo.update(id, dto)
    if (!row) throw notFound('Egreso no encontrado')
    return row
  }

  async remove(id: string) {
    if (!(await this.repo.remove(id))) throw notFound('Egreso no encontrado')
  }
}
