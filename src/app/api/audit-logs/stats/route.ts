import { handler } from '@/server/http/handler'

export const dynamic = 'force-dynamic'

export const GET = handler(async ({ services }) => services.audit.stats())
