import { handler } from '@/server/http/handler'

export const dynamic = 'force-dynamic'

export const POST = handler(async ({ services }) => {
  await services.backup.reset()
  return { ok: true }
})
