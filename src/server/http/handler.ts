import { NextResponse, type NextRequest } from 'next/server'
import { ZodError, type ZodTypeAny, type z } from 'zod'
import { AppError, badRequest, unauthorized } from '@/server/common/errors'
import type { RequestContext } from '@/server/common/context'
import { createServices, type Services } from '@/server/container'
import { SESSION_COOKIE, verifySession } from '@/server/modules/auth/session'

/**
 * Adaptador Next.js -> servicios. Es la única capa que conoce `NextRequest/NextResponse`;
 * en Nest.js se reemplaza por controladores + guard de sesión + filtro de excepciones.
 */
export interface HandlerArgs<P> {
  req: NextRequest
  ctx: RequestContext
  params: P
  services: Services
  /** Solo en rutas autenticadas. */
  user: { id: string; username: string; full_name: string }
}

interface Options {
  /** false = ruta pública (login). Por defecto exige sesión válida. */
  auth?: boolean
  status?: number
}

export function handler<P = Record<string, string>>(fn: (a: HandlerArgs<P>) => Promise<unknown>, opts: Options = {}) {
  const { auth = true, status = 200 } = opts
  return async (req: NextRequest, route: { params: P }): Promise<NextResponse> => {
    try {
      const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value, process.env.AUTH_JWT_SECRET)
      if (auth && !session) throw unauthorized()

      const ctx: RequestContext = {
        actor: session ? { id: session.sub, username: session.username } : null,
      }
      const services = createServices(ctx)

      // La sesión debe seguir siendo válida en base de datos (usuario activo): corta sesiones de usuarios desactivados.
      if (auth && session) await services.auth.currentUser(session.sub)

      const result = await fn({
        req, ctx, params: route?.params ?? ({} as P), services,
        user: session ? { id: session.sub, username: session.username, full_name: session.full_name } : (null as never),
      })
      if (result instanceof NextResponse) return result
      return NextResponse.json(result ?? { ok: true }, { status })
    } catch (e) {
      return errorResponse(e)
    }
  }
}

export function errorResponse(e: unknown): NextResponse {
  if (e instanceof AppError) {
    return NextResponse.json({ message: e.message, code: e.code }, { status: e.status })
  }
  if (e instanceof ZodError) {
    const issue = e.issues[0]
    const path = issue.path.length ? ` (${issue.path.join('.')})` : ''
    const msg = issue.code === 'custom' || issue.message !== 'Required' ? issue.message : `Falta un dato obligatorio${path}`
    return NextResponse.json({ message: msg, code: 'VALIDATION', issues: e.issues.map((i) => ({ path: i.path, message: i.message })) }, { status: 400 })
  }
  console.error('[api] error no controlado:', e)
  return NextResponse.json({ message: 'Error interno del servidor', code: 'INTERNAL' }, { status: 500 })
}

/** Lee y valida el cuerpo JSON con un esquema zod. */
export async function readBody<S extends ZodTypeAny>(req: NextRequest, schema: S): Promise<z.infer<S>> {
  let json: unknown
  try {
    json = await req.json()
  } catch {
    throw badRequest('El cuerpo de la petición no es un JSON válido')
  }
  return schema.parse(json)
}

/** Valida los query params con un esquema zod. */
export function readQuery<S extends ZodTypeAny>(req: NextRequest, schema: S): z.infer<S> {
  return schema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()))
}

export const clientIp = (req: NextRequest) =>
  req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
