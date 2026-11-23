import { z } from 'zod'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
const optDate = z.preprocess((v) => (v === '' || v === undefined ? null : v), isoDate.nullable())

export const studentSchema = z.object({
  first_names: z.string().trim().min(1, 'Nombres y apellidos son obligatorios').max(80),
  last_names: z.string().trim().min(1, 'Nombres y apellidos son obligatorios').max(80),
  rut: z.string().trim().min(1, 'El RUT es obligatorio').max(14),
  birth_date: optDate,
  sex: z.enum(['F', 'M'], { errorMap: () => ({ message: 'Selecciona el sexo del alumno' }) }),
  weight_kg: z.preprocess(
    (v) => (v === '' || v === undefined ? null : v),
    z.number({ invalid_type_error: 'El peso debe ser mayor a 0' }).gt(0, 'El peso debe ser mayor a 0').max(250, 'El peso no puede superar 250 kg').nullable(),
  ),
  phone: z.string().trim().max(20).default(''),
  email: z
    .string()
    .trim()
    .max(120)
    .refine((v) => v === '' || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), 'El correo no es válido')
    .default(''),
  notes: z.string().trim().max(300).default(''),
  status: z.string().trim().min(1).max(40).default('Activo'),
  joined_on: optDate,
})
export type StudentDto = z.infer<typeof studentSchema>

export const withdrawSchema = z.object({
  reason: z.string().trim().min(1, 'El motivo es obligatorio').max(300),
})

export const searchSchema = z.object({ q: z.string().trim().max(80).default('') })

export const paymentSchema = z.object({
  student_id: z.string().uuid('Alumno inválido'),
  plan_name: z.string().trim().min(1, 'Selecciona un plan'),
  payment_method: z.string().trim().min(1, 'Selecciona el tipo de pago'),
  amount: z.number({ invalid_type_error: 'Ingresa un monto mayor a 0' }).int().gt(0, 'Ingresa un monto mayor a 0'),
  paid_on: isoDate.optional(),
  notes: z.string().trim().max(200).default(''),
  /** Solo planes diarios: registra la clase como «por cobrar» (acumulativa) en vez de cobrarla ahora. */
  pending: z.boolean().default(false),
})
export type PaymentDto = z.infer<typeof paymentSchema>

/** Cobro de una o varias clases diarias que estaban por cobrar. */
export const settleSchema = z.object({
  student_id: z.string().uuid('Alumno inválido'),
  payment_ids: z.array(z.string().uuid()).min(1, 'Selecciona al menos una clase por cobrar').max(100),
  payment_method: z.string().trim().min(1, 'Selecciona el tipo de pago'),
  amount: z.number({ invalid_type_error: 'Ingresa un monto mayor a 0' }).int().gt(0, 'Ingresa un monto mayor a 0'),
  paid_on: isoDate.optional(),
  notes: z.string().trim().max(200).default(''),
})
export type SettleDto = z.infer<typeof settleSchema>
