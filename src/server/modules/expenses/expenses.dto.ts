import { z } from 'zod'

export const expenseMonthSchema = z.object({
  items: z
    .array(
      z.object({
        category: z.string().trim().min(1).max(60),
        amount: z.number().int('Monto inválido').gt(0, 'Monto inválido'),
        detail: z.string().trim().max(120).default(''),
      }),
    )
    .refine((a) => new Set(a.map((i) => i.category)).size === a.length, 'Hay tipos de egreso repetidos'),
})
export type ExpenseMonthDto = z.infer<typeof expenseMonthSchema>

export const periodSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2200),
  month: z.coerce.number().int().min(1).max(12),
})
