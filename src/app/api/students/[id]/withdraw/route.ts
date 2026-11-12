import { handler, readBody } from '@/server/http/handler'
import { withdrawSchema } from '@/server/modules/students/students.dto'

export const dynamic = 'force-dynamic'

export const POST = handler<{ id: string }>(async ({ req, services, params }) =>
  services.students.withdraw(params.id, (await readBody(req, withdrawSchema)).reason))
