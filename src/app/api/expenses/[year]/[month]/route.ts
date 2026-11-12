import { handler, readBody } from '@/server/http/handler'
import { expenseMonthSchema, periodSchema } from '@/server/modules/expenses/expenses.dto'

export const dynamic = 'force-dynamic'

export const PUT = handler<{ year: string; month: string }>(async ({ req, services, params }) => {
  const { year, month } = periodSchema.parse(params)
  return services.expenses.saveMonth(year, month, await readBody(req, expenseMonthSchema))
})
