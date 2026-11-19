import { handler, readBody } from '@/server/http/handler'
import { expenseSchema } from '@/server/modules/expenses/expenses.dto'

export const dynamic = 'force-dynamic'

type P = { id: string }
export const PUT = handler<P>(async ({ req, services, params }) => services.expenses.update(params.id, await readBody(req, expenseSchema)))
export const DELETE = handler<P>(async ({ services, params }) => {
  await services.expenses.remove(params.id)
  return { ok: true }
})
