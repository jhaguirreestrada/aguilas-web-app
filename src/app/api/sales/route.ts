import { handler, readBody, readQuery } from '@/server/http/handler'
import { saleSchema, salesQuerySchema } from '@/server/modules/sales/sales.dto'

export const dynamic = 'force-dynamic'

export const GET = handler(async ({ req, services }) => services.sales.list(readQuery(req, salesQuerySchema)))
export const POST = handler(async ({ req, services }) => services.sales.register(await readBody(req, saleSchema)), { status: 201 })
