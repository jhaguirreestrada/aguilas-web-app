import { handler, readBody } from '@/server/http/handler'
import { collectSchema } from '@/server/modules/sales/sales.dto'

export const dynamic = 'force-dynamic'

export const POST = handler<{ id: string }>(async ({ req, services, params }) => services.sales.collect(params.id, await readBody(req, collectSchema)))
