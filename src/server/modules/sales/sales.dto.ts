import { z } from 'zod'

export const saleSchema = z.object({
  items: z
    .array(
      z.object({
        product_id: z.string().uuid('Producto inválido'),
        quantity: z.number().int('La cantidad debe ser al menos 1').min(1, 'La cantidad debe ser al menos 1'),
        amount: z.number().int().min(0, 'Monto inválido').nullish(),
      }),
    )
    .min(1, 'Agrega al menos un producto'),
  payment_method: z.string().trim().min(1, 'Selecciona el tipo de pago'),
  student_id: z.string().uuid().nullish().or(z.literal('').transform(() => null)),
  notes: z.string().trim().max(150).default(''),
})
export type SaleDto = z.infer<typeof saleSchema>

export const salesQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('').transform(() => undefined)),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('').transform(() => undefined)),
  payment_method: z.string().optional().or(z.literal('').transform(() => undefined)),
  status: z.enum(['completed', 'voided']).optional().or(z.literal('').transform(() => undefined)),
})
export type SalesQuery = z.infer<typeof salesQuerySchema>
