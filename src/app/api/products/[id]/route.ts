import { handler, readBody } from '@/server/http/handler'
import { productSchema } from '@/server/modules/products/products.dto'

export const dynamic = 'force-dynamic'

type P = { id: string }
export const PUT = handler<P>(async ({ req, services, params }) => services.products.update(params.id, await readBody(req, productSchema)))
export const DELETE = handler<P>(async ({ services, params }) => {
  await services.products.remove(params.id)
  return { ok: true }
})
