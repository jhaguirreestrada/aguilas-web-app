import type { Db } from '@/server/db/client'
import { unwrap } from '@/server/db/client'
import type { InventoryMovement, Product } from '@/shared/types'

export type ProductRow = Omit<Product, 'id' | 'created_at' | 'updated_at'>

export class ProductsRepository {
  constructor(private readonly db: Db) {}

  async listAll(): Promise<Product[]> {
    return unwrap(await this.db.from('products').select('*').order('name')) as Product[]
  }

  async findById(id: string): Promise<Product | null> {
    return unwrap(await this.db.from('products').select('*').eq('id', id).maybeSingle()) as Product | null
  }

  async insert(row: ProductRow): Promise<Product> {
    return unwrap(await this.db.from('products').insert(row).select('*').single(), {
      duplicate: 'Ya existe un producto con ese código',
    }) as Product
  }

  async update(id: string, row: Partial<ProductRow>): Promise<Product> {
    return unwrap(await this.db.from('products').update(row).eq('id', id).select('*').single(), {
      duplicate: 'Ya existe un producto con ese código',
    }) as Product
  }

  async remove(id: string): Promise<void> {
    unwrap(await this.db.from('products').delete().eq('id', id))
  }

  async countSaleItems(productId: string): Promise<number> {
    const res = await this.db.from('sale_items').select('id', { count: 'exact', head: true }).eq('product_id', productId)
    if (res.error) unwrap(res)
    return res.count ?? 0
  }

  async movements(productId: string): Promise<InventoryMovement[]> {
    return unwrap(
      await this.db
        .from('inventory_movements')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .limit(200),
    ) as InventoryMovement[]
  }

  // --- Operaciones atómicas (funciones SQL) ---
  async adjustStock(a: { product_id: string; type: string; quantity: number; reason: string; document: string; on: string }): Promise<Product> {
    return unwrap(
      await this.db.rpc('adjust_stock', {
        p_product_id: a.product_id, p_type: a.type, p_quantity: a.quantity,
        p_reason: a.reason, p_document: a.document, p_on: a.on,
      }),
    ) as Product
  }

  async receiveStock(a: {
    product_id: string; quantity: number; unit_cost: number; document: string; notes: string
    movement_type: string; total: number | null; on: string
  }): Promise<Product> {
    return unwrap(
      await this.db.rpc('receive_stock', {
        p_product_id: a.product_id, p_quantity: a.quantity, p_unit_cost: a.unit_cost,
        p_document: a.document, p_notes: a.notes, p_movement_type: a.movement_type,
        p_total: a.total, p_on: a.on,
      }),
    ) as Product
  }
}
