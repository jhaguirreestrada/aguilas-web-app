import { handler, readBody } from '@/server/http/handler'
import { productSchema } from '@/server/modules/products/products.dto'

export const dynamic = 'force-dynamic'

export const GET = handler(async ({ services }) => services.products.list())
export const POST = handler(async ({ req, services }) => services.products.create(await readBody(req, productSchema)), { status: 201 })
