import { z } from 'zod'

const username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9._-]{3,40}$/, 'El usuario debe tener 3–40 caracteres: letras, números, punto, guion y guion bajo')

const password = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(72, 'La contraseña no puede exceder 72 caracteres')

const fullName = z.string().trim().min(1, 'El nombre es obligatorio').max(120)
const email = z
  .string()
  .trim()
  .max(120)
  .refine((v) => v === '' || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), 'El correo no es válido')
  .transform((v) => (v === '' ? null : v.toLowerCase()))
  .nullable()
  .optional()

export const createUserSchema = z.object({
  username,
  full_name: fullName,
  email,
  password,
  is_active: z.boolean().default(true),
})
export type CreateUserDto = z.infer<typeof createUserSchema>

export const updateUserSchema = z.object({
  full_name: fullName,
  email,
  is_active: z.boolean(),
  password: password.optional().or(z.literal('').transform(() => undefined)),
})
export type UpdateUserDto = z.infer<typeof updateUserSchema>

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Ingresa tu contraseña actual'),
  new_password: password,
})

export const usersQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional().or(z.literal('').transform(() => undefined)),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
})
export type UsersQuery = z.infer<typeof usersQuerySchema>

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'El nombre de usuario es obligatorio').max(40, 'El usuario no puede exceder los 40 caracteres'),
  password: z.string().min(1, 'La contraseña es obligatoria').max(200),
})
