import { SignJWT, jwtVerify } from 'jose'

/** Utilidades de sesión. Solo depende de `jose`, por eso también corren en el middleware (Edge). */
export const SESSION_COOKIE = 'auth_token'

export interface SessionPayload {
  sub: string
  username: string
  full_name: string
}

const key = (secret: string) => new TextEncoder().encode(secret)

export async function signSession(payload: SessionPayload, secret: string, hours: number): Promise<string> {
  return new SignJWT({ username: payload.username, full_name: payload.full_name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${Math.round(hours * 3600)}s`)
    .sign(key(secret))
}

export async function verifySession(token: string | undefined, secret: string | undefined): Promise<SessionPayload | null> {
  if (!token || !secret) return null
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: ['HS256'] })
    if (!payload.sub || typeof payload.username !== 'string') return null
    return { sub: payload.sub, username: payload.username, full_name: String(payload.full_name ?? '') }
  } catch {
    return null
  }
}
