import { handler } from '@/server/http/handler'

export const dynamic = 'force-dynamic'

export const GET = handler<{ id: string }>(async ({ services, params }) => services.students.weightHistory(params.id))
