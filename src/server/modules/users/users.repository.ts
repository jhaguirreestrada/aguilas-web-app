import type { Db } from '@/server/db/client'
import { unwrap } from '@/server/db/client'
import { sanitizeSearch } from '../audit/audit.repository'
import type { AppUser } from '@/shared/types'

const PUBLIC_COLUMNS = 'id,username,full_name,email,is_active,last_login_at,created_at,updated_at'

export interface UserWithHash extends AppUser {
  password_hash: string
}

export class UsersRepository {
  constructor(private readonly db: Db) {}

  async list(
    f: { search?: string; status?: 'active' | 'inactive' },
    page: number,
    limit: number,
  ): Promise<{ data: AppUser[]; total: number }> {
    let q = this.db.from('users').select(PUBLIC_COLUMNS, { count: 'exact' })
    if (f.status) q = q.eq('is_active', f.status === 'active')
    if (f.search) {
      const s = sanitizeSearch(f.search)
      if (s) q = q.or(`username.ilike.%${s}%,full_name.ilike.%${s}%,email.ilike.%${s}%`)
    }
    const from = (page - 1) * limit
    const res = await q.order('username').range(from, from + limit - 1)
    if (res.error) unwrap(res)
    return { data: (res.data ?? []) as unknown as AppUser[], total: res.count ?? 0 }
  }

  async findById(id: string): Promise<AppUser | null> {
    const res = await this.db.from('users').select(PUBLIC_COLUMNS).eq('id', id).maybeSingle()
    return unwrap(res) as unknown as AppUser | null
  }

  /** Incluye `password_hash`: solo para autenticación. */
  async findByUsernameWithHash(username: string): Promise<UserWithHash | null> {
    const res = await this.db.from('users').select(`${PUBLIC_COLUMNS},password_hash`).eq('username', username).maybeSingle()
    return unwrap(res) as unknown as UserWithHash | null
  }

  async findByIdWithHash(id: string): Promise<UserWithHash | null> {
    const res = await this.db.from('users').select(`${PUBLIC_COLUMNS},password_hash`).eq('id', id).maybeSingle()
    return unwrap(res) as unknown as UserWithHash | null
  }

  async countActive(): Promise<number> {
    const res = await this.db.from('users').select('id', { count: 'exact', head: true }).eq('is_active', true)
    if (res.error) unwrap(res)
    return res.count ?? 0
  }

  async insert(row: { username: string; full_name: string; email: string | null; password_hash: string; is_active: boolean }): Promise<AppUser> {
    const res = await this.db.from('users').insert(row).select(PUBLIC_COLUMNS).single()
    return unwrap(res, { duplicate: 'Ya existe un usuario con ese nombre de usuario o correo' }) as unknown as AppUser
  }

  async update(id: string, patch: Partial<{ full_name: string; email: string | null; is_active: boolean; password_hash: string }>): Promise<AppUser> {
    const res = await this.db.from('users').update(patch).eq('id', id).select(PUBLIC_COLUMNS).single()
    return unwrap(res, { duplicate: 'Ya existe un usuario con ese correo' }) as unknown as AppUser
  }

  async touchLogin(id: string): Promise<void> {
    unwrap(await this.db.from('users').update({ last_login_at: new Date().toISOString() }).eq('id', id))
  }

  async remove(id: string): Promise<void> {
    unwrap(await this.db.from('users').delete().eq('id', id))
  }
}
