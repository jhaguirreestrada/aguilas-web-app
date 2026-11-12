import bcrypt from 'bcryptjs'
import { UsersRepository } from './users.repository'
import type { CreateUserDto, UpdateUserDto, UsersQuery } from './users.dto'
import { badRequest, conflict, notFound, unauthorized } from '@/server/common/errors'
import type { Actor } from '@/server/common/context'
import type { AppUser, Paginated } from '@/shared/types'

const BCRYPT_COST = 10

export const hashPassword = (plain: string) => bcrypt.hash(plain, BCRYPT_COST)
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash)

export class UsersService {
  constructor(
    private readonly repo: UsersRepository,
    private readonly actor: Actor | null,
  ) {}

  async list(q: UsersQuery): Promise<Paginated<AppUser>> {
    const { data, total } = await this.repo.list({ search: q.search, status: q.status || undefined }, q.page, q.limit)
    return { data, total, page: q.page, limit: q.limit }
  }

  async get(id: string): Promise<AppUser> {
    const u = await this.repo.findById(id)
    if (!u) throw notFound('Usuario no encontrado')
    return u
  }

  async create(dto: CreateUserDto): Promise<AppUser> {
    return this.repo.insert({
      username: dto.username,
      full_name: dto.full_name,
      email: dto.email ?? null,
      password_hash: await hashPassword(dto.password),
      is_active: dto.is_active,
    })
  }

  async update(id: string, dto: UpdateUserDto): Promise<AppUser> {
    const current = await this.get(id)
    if (!dto.is_active && current.is_active) await this.assertCanDeactivate(id)

    const patch: Parameters<UsersRepository['update']>[1] = {
      full_name: dto.full_name,
      email: dto.email ?? null,
      is_active: dto.is_active,
    }
    if (dto.password) patch.password_hash = await hashPassword(dto.password)
    return this.repo.update(id, patch)
  }

  async remove(id: string): Promise<void> {
    const current = await this.get(id)
    if (current.is_active) await this.assertCanDeactivate(id)
    await this.repo.remove(id)
  }

  /** El usuario autenticado cambia su propia contraseña. */
  async changeOwnPassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const u = await this.repo.findByIdWithHash(userId)
    if (!u) throw unauthorized()
    if (!(await verifyPassword(currentPassword, u.password_hash))) throw badRequest('La contraseña actual no es correcta')
    if (currentPassword === newPassword) throw badRequest('La nueva contraseña debe ser distinta de la actual')
    await this.repo.update(userId, { password_hash: await hashPassword(newPassword) })
  }

  /** Reglas de seguridad: nadie se desactiva/borra a sí mismo y siempre queda un usuario activo. */
  private async assertCanDeactivate(id: string) {
    if (this.actor?.id === id) throw conflict('No puedes desactivar ni eliminar tu propio usuario', 'SELF_ACTION')
    if ((await this.repo.countActive()) <= 1) throw conflict('Debe existir al menos un usuario activo', 'LAST_ACTIVE_USER')
  }
}
