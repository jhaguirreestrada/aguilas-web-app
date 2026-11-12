import { handler, readBody } from '@/server/http/handler'
import { studentSchema } from '@/server/modules/students/students.dto'

export const dynamic = 'force-dynamic'

type P = { id: string }
export const GET = handler<P>(async ({ services, params }) => services.students.getSummary(params.id))
export const PUT = handler<P>(async ({ req, services, params }) => services.students.update(params.id, await readBody(req, studentSchema)))
export const DELETE = handler<P>(async ({ services, params }) => {
  await services.students.remove(params.id)
  return { ok: true }
})
