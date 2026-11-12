import { handler, readQuery } from '@/server/http/handler'
import { dashboardQuerySchema } from '@/server/modules/dashboard/dashboard.service'

export const dynamic = 'force-dynamic'

export const GET = handler(async ({ req, services }) => services.dashboard.build(readQuery(req, dashboardQuerySchema)))
