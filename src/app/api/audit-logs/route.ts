import { handler, readQuery } from '@/server/http/handler'
import { auditQuerySchema } from '@/server/modules/audit/audit.service'

export const dynamic = 'force-dynamic'

export const GET = handler(async ({ req, services }) => services.audit.list(readQuery(req, auditQuerySchema)))
