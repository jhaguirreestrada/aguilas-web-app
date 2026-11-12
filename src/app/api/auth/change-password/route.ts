import { handler, readBody } from '@/server/http/handler'
import { changePasswordSchema } from '@/server/modules/users/users.dto'

export const dynamic = 'force-dynamic'

export const POST = handler(async ({ req, services, user }) => {
  const dto = await readBody(req, changePasswordSchema)
  await services.users.changeOwnPassword(user.id, dto.current_password, dto.new_password)
  return { ok: true }
})
