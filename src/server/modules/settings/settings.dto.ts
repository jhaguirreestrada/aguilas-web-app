import { z } from 'zod'
import { norm } from '@/shared/format'
import { CORE_STATUSES } from '@/shared/domain/students'

const label = (title: string) =>
  z.array(z.string().trim().min(1, `Hay valores vacíos en «${title}»`).max(40))
    .min(1, `Agrega al menos un valor en «${title}»`)
    .refine((a) => new Set(a.map(norm)).size === a.length, `Hay valores repetidos en «${title}»`)

const plan = z.object({
  name: z.string().trim().min(1, 'Revisa los planes: nombre obligatorio').max(40),
  unit: z.enum(['months', 'days']),
  quantity: z.number().int().min(1, 'Revisa los planes: duración ≥ 1').max(365),
  amount: z.number().int().min(0, 'Revisa los planes: monto ≥ 0'),
})

const weightCat = (title: string) =>
  z.array(
    z.object({
      name: z.string().trim().min(1, `Revisa «${title}»: nombre obligatorio`).max(30),
      min_kg: z.number().min(0),
      max_kg: z.number().min(0),
    }).refine((c) => c.min_kg <= c.max_kg, `Revisa «${title}»: mínimo ≤ máximo`),
  )
    .min(1, `Agrega categorías en «${title}»`)
    .refine((a) => new Set(a.map((c) => norm(c.name))).size === a.length, `Hay nombres repetidos en «${title}»`)

export const settingsSchema = z
  .object({
    gym_name: z.string().trim().min(1, 'El nombre del gimnasio es obligatorio').max(80),
    warning_days: z.number().int().min(0, 'Los días de advertencia deben ser 0 o más').max(60),
    inactivity_minutes: z.number({ invalid_type_error: 'Ingresa el tiempo de inactividad' }).int('El tiempo de inactividad debe ser un número entero de minutos').min(1, 'El tiempo de inactividad debe ser de al menos 1 minuto').max(480, 'El tiempo de inactividad no puede superar 480 minutos'),
    whatsapp: z.object({
      overdue: z.string().max(500),
      due_soon: z.string().max(500),
      current: z.string().max(500),
    }),
    payment_methods: label('Tipos de pago'),
    plans: z.array(plan).min(1, 'Agrega al menos un plan')
      .refine((a) => new Set(a.map((p) => norm(p.name))).size === a.length, 'Hay planes con el mismo nombre'),
    student_statuses: label('Estados de alumno'),
    product_categories: label('Categorías de producto'),
    expense_categories: label('Tipos de egreso'),
    weight_categories_female: weightCat('Categorías Mujer (Amateur)'),
    weight_categories_male: weightCat('Categorías Hombre (Amateur)'),
  })
  .superRefine((s, ctx) => {
    for (const core of CORE_STATUSES) {
      if (!s.student_statuses.includes(core))
        ctx.addIssue({ code: 'custom', message: `Falta el estado obligatorio «${core}»`, path: ['student_statuses'] })
    }
  })
