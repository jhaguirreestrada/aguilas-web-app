import { handler, readBody } from '@/server/http/handler'
import { paymentSchema } from '@/server/modules/students/students.dto'

export const dynamic = 'force-dynamic'

export const POST = handler(async ({ req, services }) => services.payments.register(await readBody(req, paymentSchema)), { status: 201 })
