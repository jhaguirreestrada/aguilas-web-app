import { handler } from '@/server/http/handler'

export const dynamic = 'force-dynamic'

export const GET = handler(async ({ user }) => ({ user }))
