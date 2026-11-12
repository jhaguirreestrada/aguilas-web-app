import { z } from 'zod'

const schema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  SUPABASE_DB_SCHEMA: z.string().default('boxing_gym'),
  AUTH_JWT_SECRET: z.string().min(32, 'AUTH_JWT_SECRET debe tener al menos 32 caracteres'),
  AUTH_SESSION_HOURS: z.coerce.number().positive().default(8),
  APP_TIMEZONE: z.string().default('America/Santiago'),
})

export type Env = z.infer<typeof schema>
let cached: Env | null = null

/** Lectura perezosa y validada de variables de entorno (no se evalúa durante el build). */
export function env(): Env {
  if (!cached) {
    const parsed = schema.safeParse(process.env)
    if (!parsed.success) {
      const detail = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
      throw new Error(`Configuración de entorno inválida → ${detail}`)
    }
    cached = parsed.data
  }
  return cached
}
