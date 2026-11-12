import { handler, readBody, clientIp } from '@/server/http/handler'
import { NextResponse } from 'next/server'
import { loginSchema } from '@/server/modules/users/users.dto'
import { SESSION_COOKIE } from '@/server/modules/auth/session'
import { env } from '@/server/config/env'

export const dynamic = 'force-dynamic'

export const POST = handler(async ({ req, services }) => {
  const { username, password } = await readBody(req, loginSchema)
  const { token, user } = await services.auth.login(username, password, clientIp(req))
  const res = NextResponse.json({ user })
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.round(env().AUTH_SESSION_HOURS * 3600),
  })
  return res
}, { auth: false })
