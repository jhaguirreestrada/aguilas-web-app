import { handler } from '@/server/http/handler'

export const dynamic = 'force-dynamic'

export const POST = handler<{ id: string }>(async ({ services, params }) => services.students.reactivate(params.id))
