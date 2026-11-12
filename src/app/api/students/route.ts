import { handler, readBody } from '@/server/http/handler'
import { studentSchema } from '@/server/modules/students/students.dto'

export const dynamic = 'force-dynamic'

export const GET = handler(async ({ services }) => services.students.listSummaries())
export const POST = handler(async ({ req, services }) => services.students.create(await readBody(req, studentSchema)), { status: 201 })
