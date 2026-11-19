import { z } from 'zod'

export const expenseSchema = z.object({
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Indica la fecha del egreso'),
  category: z.string().trim().min(1, 'Selecciona la categoría').max(60),
  detail: z.string().trim().min(1, 'La descripción es obligatoria').max(200),
  amount: z.number().int('Indica el monto').gt(0, 'Indica el monto'),
  payment_method: z.string().trim().max(60).default(''),
  comment: z.string().trim().max(200).default(''),
})
export type ExpenseDto = z.infer<typeof expenseSchema>
