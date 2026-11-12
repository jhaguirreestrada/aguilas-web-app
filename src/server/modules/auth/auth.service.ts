import bcrypt from 'bcryptjs'
import { UsersRepository } from '../users/users.repository'
import { verifyPassword } from '../users/users.service'
import { AuditService } from '../audit/audit.service'
import { signSession, type SessionPayload } from './session'
import { env } from '@/server/config/env'
import { AppError, forbidden, unauthorized } from '@/server/common/errors'
import type { SessionUser } from '@/shared/types'

// Hash bcrypt válido de una contraseña inexistente: iguala el tiempo de respuesta cuando el usuario no existe.
const DUMMY_HASH = bcrypt.hashSync('no-such-user-placeholder', 10)

// Límite de intentos fallidos en memoria (por instancia): freno básico contra fuerza bruta.
const MAX_FAILS = 10
const WINDOW_MS = 15 * 60 * 1000
const fails = new Map<string, { n: number; first: number }>()

function checkRate(key: string) {
  const f = fails.get(key)
  if (f && Date.now() - f.first > WINDOW_MS) fails.delete(key)
  const cur = fails.get(key)
  if (cur && cur.n >= MAX_FAILS) throw new AppError(429, 'Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo.', 'RATE_LIMITED')
}
function registerFail(key: string) {
  const cur = fails.get(key)
  fails.set(key, cur ? { n: cur.n + 1, first: cur.first } : { n: 1, first: Date.now() })
}

export class AuthService {
  constructor(
    private readonly users: UsersRepository,
    private readonly audit: AuditService,
  ) {}

  async login(username: string, password: string, ip: string): Promise<{ token: string; user: SessionUser }> {
    const uname = username.trim().toLowerCase()
    const rateKey = `${uname}|${ip}`
    checkRate(rateKey)

    const user = await this.users.findByUsernameWithHash(uname)
    const ok = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH)

    if (!user || !ok) {
      registerFail(rateKey)
      await this.audit.record({
        actor_user_id: user?.id ?? null,
        actor_username: uname.slice(0, 40),
        action: 'LOGIN_FAILED',
        entity: 'session',
        description: 'Intento de inicio de sesión fallido',
      })
      throw unauthorized('Usuario o contraseña incorrectos', 'INVALID_CREDENTIALS')
    }
    if (!user.is_active) throw forbidden('Usuario inactivo. Contacte al administrador.', 'USER_INACTIVE')

    fails.delete(rateKey)
    await this.users.touchLogin(user.id)
    await this.audit.record({
      actor_user_id: user.id,
      actor_username: user.username,
      action: 'LOGIN',
      entity: 'session',
      record_id: user.id,
      description: 'Inicio de sesión',
    })

    const e = env()
    const payload: SessionPayload = { sub: user.id, username: user.username, full_name: user.full_name }
    return {
      token: await signSession(payload, e.AUTH_JWT_SECRET, e.AUTH_SESSION_HOURS),
      user: { id: user.id, username: user.username, full_name: user.full_name },
    }
  }

  async logout(actor: { id: string; username: string } | null): Promise<void> {
    if (!actor) return
    await this.audit.record({
      actor_user_id: actor.id,
      actor_username: actor.username,
      action: 'LOGOUT',
      entity: 'session',
      record_id: actor.id,
      description: 'Cierre de sesión',
    })
  }

  /** Revalida contra la base: un usuario desactivado/eliminado pierde la sesión en la siguiente petición. */
  async currentUser(id: string): Promise<SessionUser> {
    const u = await this.users.findById(id)
    if (!u || !u.is_active) throw unauthorized('Sesión inválida')
    return { id: u.id, username: u.username, full_name: u.full_name }
  }
}
