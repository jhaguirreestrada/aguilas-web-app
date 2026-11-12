import { z } from 'zod'

const money = (msg: string) => z.number({ invalid_type_error: msg }).int(msg).min(0, msg)

export const productSchema = z.object({
  code: z.string().trim().max(30).default(''),
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
  category: z.string().trim().min(1, 'La categoría es obligatoria'),
  price: money('Ingresa un precio válido'),
  cost: money('Ingresa un costo válido').default(0),
  min_stock: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
  /** Solo en edición: si difiere del actual se registra un ajuste de inventario. */
  stock: z.number().int('Ingresa un stock válido (entero, 0 o más)').min(0, 'Ingresa un stock válido (entero, 0 o más)').optional(),
})
export type ProductDto = z.infer<typeof productSchema>

export const stockSchema = z.object({
  type: z.enum(['in', 'out', 'adjustment']),
  quantity: z.number().int('Ingresa una cantidad válida').min(0, 'Ingresa una cantidad válida'),
  reason: z.string().trim().max(150).default(''),
  document: z.string().trim().max(50).default(''),
  /** Costo por unidad (CLP) — si viene (o `total_cost`), la entrada es una compra. */
  unit_cost: z.number().min(0).nullish(),
  total_cost: z.number().min(0).nullish(),
  /** `initial_stock` para el stock inicial de un producto nuevo. */
  movement_type: z.enum(['in', 'initial_stock']).default('in'),
})
export type StockDto = z.infer<typeof stockSchema>
