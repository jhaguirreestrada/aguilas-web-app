import { handler, readBody, readQuery } from '@/server/http/handler'
import { createUserSchema, usersQuerySchema } from '@/server/modules/users/users.dto'

export const dynamic = 'force-dynamic'

export const GET = handler(async ({ req, services }) => services.users.list(readQuery(req, usersQuerySchema)))
export const POST = handler(async ({ req, services }) => services.users.create(await readBody(req, createUserSchema)), { status: 201 })
