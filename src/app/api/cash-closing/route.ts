import { handler, readQuery } from '@/server/http/handler'
import { cashClosingQuerySchema } from '@/server/modules/cashier/cashier.service'

export const dynamic = 'force-dynamic'

export const GET = handler(async ({ req, services }) => services.cashier.closing(readQuery(req, cashClosingQuerySchema)))
