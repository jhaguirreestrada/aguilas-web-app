import { handler, readBody } from '@/server/http/handler'
import { activitySchema } from '@/server/modules/activities/activities.service'

export const dynamic = 'force-dynamic'

export const GET = handler(async ({ services }) => services.activities.list())
export const POST = handler(async ({ req, services }) => services.activities.create(await readBody(req, activitySchema)), { status: 201 })
