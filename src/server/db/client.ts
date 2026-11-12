import { createClient, type PostgrestError, type SupabaseClient } from '@supabase/supabase-js'
import { env } from '@/server/config/env'
import { AppError } from '@/server/common/errors'
import type { Actor } from '@/server/common/context'

/**
 * Cliente de datos. Es la ÚNICA pieza que conoce a Supabase/PostgREST: los repositorios reciben
 * un `Db` y nunca importan supabase-js directamente. Al migrar a Nest.js se reemplaza por un
 * pool `pg` (o Prisma/TypeORM) manteniendo las interfaces de los repositorios.
 */
export type Db = SupabaseClient<any, any, any>

export function createDb(actor: Actor | null): Db {
  const e = env()
  return createClient(e.SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
    db: { schema: e.SUPABASE_DB_SCHEMA },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      // El trigger de auditoría lee estas cabeceras (GUC `request.headers` de PostgREST).
      headers: actor ? { 'x-actor-id': actor.id, 'x-actor-username': actor.username } : {},
      // Next.js 14 cachea `fetch` por defecto: los datos de negocio jamás deben quedar en caché.
      fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
    },
  })
}

/** Traduce errores de Postgres/PostgREST a errores de aplicación sin filtrar detalles internos. */
export function mapDbError(error: PostgrestError, messages: { duplicate?: string; reference?: string } = {}): AppError {
  switch (error.code) {
    case 'P0001': // RAISE EXCEPTION de nuestras funciones: mensaje de negocio en español
      return new AppError(400, error.message)
    case '23505':
      return new AppError(409, messages.duplicate ?? 'Ya existe un registro con esos datos', 'DUPLICATE')
    case '23503':
      return new AppError(409, messages.reference ?? 'El registro está relacionado con otros datos', 'REFERENCED')
    case '23514':
    case '22P02':
    case '22007':
    case '22003':
      return new AppError(400, 'Hay datos con un formato o rango inválido', 'INVALID_DATA')
    default:
      console.error('[db]', error.code, error.message, error.details ?? '')
      return new AppError(500, 'Error al acceder a la base de datos', 'DB_ERROR')
  }
}

type DbResult<T> = { data: T | null; error: PostgrestError | null }

/** Devuelve `data` o lanza el error de aplicación correspondiente. */
export function unwrap<T>(res: DbResult<T>, messages?: { duplicate?: string; reference?: string }): T {
  if (res.error) throw mapDbError(res.error, messages)
  return res.data as T
}
