import type { Db } from '@/server/db/client'
import { unwrap } from '@/server/db/client'
import type { ExpenseMonthDto } from './expenses.dto'
import type { Expense } from '@/shared/types'

export class ExpensesRepository {
  constructor(private readonly db: Db) {}

  async listAll(): Promise<Expense[]> {
    return unwrap(
      await this.db
        .from('expenses')
        .select('id,year,month,category,amount,detail')
        .order('year', { ascending: false })
        .order('month', { ascending: false }),
    ) as Expense[]
  }

  async saveMonth(year: number, month: number, items: ExpenseMonthDto['items']): Promise<void> {
    unwrap(await this.db.rpc('save_expense_month', { p_year: year, p_month: month, p_items: items }))
  }
}

export class ExpensesService {
  constructor(private readonly repo: ExpensesRepository) {}

  list() {
    return this.repo.listAll()
  }

  async saveMonth(year: number, month: number, dto: ExpenseMonthDto): Promise<Expense[]> {
    await this.repo.saveMonth(year, month, dto.items)
    return this.repo.listAll()
  }
}
