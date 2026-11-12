import { handler, readBody } from '@/server/http/handler'
import { activitySchema } from '@/server/modules/activities/activities.service'

export const dynamic = 'force-dynamic'

type P = { id: string }
export const PUT = handler<P>(async ({ req, services, params }) => services.activities.update(params.id, await readBody(req, activitySchema)))
export const DELETE = handler<P>(async ({ services, params }) => {
  await services.activities.remove(params.id)
  return { ok: true }
})
