import { handler, readBody } from '@/server/http/handler'
import { updateUserSchema } from '@/server/modules/users/users.dto'

export const dynamic = 'force-dynamic'

type P = { id: string }
export const GET = handler<P>(async ({ services, params }) => services.users.get(params.id))
export const PUT = handler<P>(async ({ req, services, params }) => services.users.update(params.id, await readBody(req, updateUserSchema)))
export const DELETE = handler<P>(async ({ services, params }) => {
  await services.users.remove(params.id)
  return { ok: true }
})
