import { handler, readBody } from '@/server/http/handler'
import { expenseSchema } from '@/server/modules/expenses/expenses.dto'

export const dynamic = 'force-dynamic'

export const GET = handler(async ({ services }) => services.expenses.list())
export const POST = handler(async ({ req, services }) => services.expenses.create(await readBody(req, expenseSchema)), { status: 201 })
