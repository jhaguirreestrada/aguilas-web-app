import { handler } from '@/server/http/handler'
import { NextResponse } from 'next/server'
import { badRequest } from '@/server/common/errors'
import { COLLECTIONS, type Collection } from '@/server/modules/backup/backup.mapper'

export const dynamic = 'force-dynamic'

export const GET = handler(async ({ req, services }) => {
  const col = req.nextUrl.searchParams.get('collection')
  const stamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(/[-:]/g, '')
  let body: unknown
  let name: string
  if (col) {
    if (!(COLLECTIONS as readonly string[]).includes(col)) throw badRequest('Colección inválida')
    body = await services.backup.exportCollection(col as Collection)
    name = `${col}.json`
  } else {
    body = await services.backup.exportAll()
    name = `aguilas_respaldo_${stamp}.json`
  }
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'no-store',
    },
  })
})
