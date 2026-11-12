import { handler } from '@/server/http/handler'

export const dynamic = 'force-dynamic'

export const GET = handler(async ({ services }) => services.settings.get())
export const PUT = handler(async ({ req, services }) => services.settings.update(await req.json().catch(() => null)))
