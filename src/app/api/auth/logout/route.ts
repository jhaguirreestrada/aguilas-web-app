import { handler } from '@/server/http/handler'
import { NextResponse } from 'next/server'
import { SESSION_COOKIE } from '@/server/modules/auth/session'

export const dynamic = 'force-dynamic'

export const POST = handler(async ({ services, ctx }) => {
  await services.auth.logout(ctx.actor)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}, { auth: false })
