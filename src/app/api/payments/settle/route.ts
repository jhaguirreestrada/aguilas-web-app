import { handler, readBody } from '@/server/http/handler'
import { settleSchema } from '@/server/modules/students/students.dto'

export const dynamic = 'force-dynamic'

/** Cobra una o varias clases diarias que estaban «por cobrar». */
export const POST = handler(async ({ req, services }) => services.payments.settle(await readBody(req, settleSchema)))
