import { handler, readBody } from '@/server/http/handler'
import { importSchema } from '@/server/modules/backup/backup.service'

export const dynamic = 'force-dynamic'

export const POST = handler(async ({ req, services }) => services.backup.import(await readBody(req, importSchema)))
