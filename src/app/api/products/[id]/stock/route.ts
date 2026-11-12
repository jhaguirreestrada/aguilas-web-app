import { handler, readBody } from '@/server/http/handler'
import { stockSchema } from '@/server/modules/products/products.dto'

export const dynamic = 'force-dynamic'

export const POST = handler<{ id: string }>(async ({ req, services, params }) =>
  services.products.moveStock(params.id, await readBody(req, stockSchema)))
