import { handler, readBody } from '@/server/http/handler'
import { transitionSchema } from '@/server/modules/activities/activities.service'

export const dynamic = 'force-dynamic'

export const POST = handler<{ id: string }>(async ({ req, services, params }) =>
  services.activities.transition(params.id, (await readBody(req, transitionSchema)).to))
