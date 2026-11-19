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
  /** Obligatorio salvo que la venta se deje por cobrar. */
  payment_method: z.string().trim().default(''),
  /** true = «Dejar por cobrar»: descuenta stock pero no registra el cobro. */
  pending: z.boolean().default(false),
  student_id: z.string().uuid().nullish().or(z.literal('').transform(() => null)),
  notes: z.string().trim().max(150).default(''),
}).superRefine((d, ctx) => {
  if (!d.pending && !d.payment_method) ctx.addIssue({ code: 'custom', path: ['payment_method'], message: 'Selecciona el tipo de pago' })
})
export type SaleDto = z.infer<typeof saleSchema>

export const collectSchema = z.object({
  payment_method: z.string().trim().min(1, 'Selecciona el tipo de pago'),
})
export type CollectDto = z.infer<typeof collectSchema>

export const salesQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('').transform(() => undefined)),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('').transform(() => undefined)),
  /** Rango por fecha de cobro (`paid_on`). */
  paid_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('').transform(() => undefined)),
  paid_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('').transform(() => undefined)),
  payment_method: z.string().optional().or(z.literal('').transform(() => undefined)),
  status: z.enum(['completed', 'pending', 'voided']).optional().or(z.literal('').transform(() => undefined)),
})
export type SalesQuery = z.infer<typeof salesQuerySchema>
