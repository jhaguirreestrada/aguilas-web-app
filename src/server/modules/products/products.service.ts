import { ProductsRepository, type ProductRow } from './products.repository'
import { SettingsRepository } from '../settings/settings.repository'
import type { ProductDto, StockDto } from './products.dto'
import { badRequest, conflict, notFound } from '@/server/common/errors'
import { env } from '@/server/config/env'
import { todayIso } from '@/shared/dates'
import { norm } from '@/shared/format'
import type { InventoryMovement, Product } from '@/shared/types'

export class ProductsService {
  constructor(
    private readonly repo: ProductsRepository,
    private readonly settings: SettingsRepository,
  ) {}

  private today() {
    return todayIso(env().APP_TIMEZONE)
  }

  list() {
    return this.repo.listAll()
  }

  async get(id: string): Promise<Product> {
    const p = await this.repo.findById(id)
    if (!p) throw notFound('Producto no encontrado')
    return p
  }

  movements(id: string): Promise<InventoryMovement[]> {
    return this.repo.movements(id)
  }

  async create(dto: ProductDto): Promise<Product> {
    await this.validate(dto, null)
    const { stock: _ignored, ...rest } = dto
    return this.repo.insert({ ...rest, stock: 0 } as ProductRow) // el stock inicial entra por /stock (queda en el kardex)
  }

  async update(id: string, dto: ProductDto): Promise<Product> {
    const current = await this.get(id)
    await this.validate(dto, id)
    const { stock, ...rest } = dto
    await this.repo.update(id, rest)
    if (stock !== undefined && stock !== current.stock) {
      await this.repo.adjustStock({ product_id: id, type: 'adjustment', quantity: stock, reason: 'Edición de producto', document: '', on: this.today() })
    }
    return this.get(id)
  }

  async remove(id: string): Promise<void> {
    await this.get(id)
    if ((await this.repo.countSaleItems(id)) > 0)
      throw conflict('El producto tiene ventas asociadas. Desactívalo en lugar de eliminarlo.', 'HAS_SALES')
    await this.repo.remove(id)
  }

  /** Movimiento de inventario. Una entrada con costo es una compra: actualiza el costo y suma a egresos «Productos». */
  async moveStock(id: string, dto: StockDto): Promise<Product> {
    await this.get(id)
    const on = this.today()
    const isPurchase = dto.type === 'in' && (dto.unit_cost != null || dto.total_cost != null)
    if (isPurchase) {
      if (dto.quantity <= 0) throw badRequest('Ingresa una cantidad mayor a 0')
      const unit = dto.unit_cost != null ? Math.round(dto.unit_cost) : Math.round((dto.total_cost as number) / dto.quantity)
      const total = dto.total_cost != null && dto.unit_cost == null ? Math.round(dto.total_cost) : null
      return this.repo.receiveStock({
        product_id: id, quantity: dto.quantity, unit_cost: unit, document: dto.document, notes: dto.reason,
        movement_type: dto.movement_type, total, on,
      })
    }
    return this.repo.adjustStock({ product_id: id, type: dto.type, quantity: dto.quantity, reason: dto.reason, document: dto.document, on })
  }

  private async validate(dto: ProductDto, selfId: string | null) {
    const cfg = await this.settings.get()
    if (!cfg.product_categories.includes(dto.category)) throw badRequest('Categoría de producto inválida')
    if (dto.code) {
      const all = await this.repo.listAll()
      if (all.some((p) => p.id !== selfId && p.code && norm(p.code) === norm(dto.code)))
        throw conflict('Ya existe un producto con ese código', 'DUPLICATE')
    }
  }
}
