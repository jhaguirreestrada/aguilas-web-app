import { handler, readQuery } from '@/server/http/handler'
import { searchSchema } from '@/server/modules/students/students.dto'

export const dynamic = 'force-dynamic'

export const GET = handler(async ({ req, services }) => services.students.search(readQuery(req, searchSchema).q))
