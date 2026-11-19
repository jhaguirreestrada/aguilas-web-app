import { SalesRepository } from './sales.repository'
import { SettingsRepository } from '../settings/settings.repository'
import type { CollectDto, SaleDto, SalesQuery } from './sales.dto'
import { badRequest, notFound } from '@/server/common/errors'
import { env } from '@/server/config/env'
import { nowTime, todayIso } from '@/shared/dates'
import type { Sale } from '@/shared/types'

export class SalesService {
  constructor(
    private readonly repo: SalesRepository,
    private readonly settings: SettingsRepository,
  ) {}

  list(q: SalesQuery) {
    return this.repo.list(q)
  }

  async get(id: string): Promise<Sale> {
    const s = await this.repo.get(id)
    if (!s) throw notFound('Venta no encontrada')
    return s
  }

  /** Registra la venta de forma atómica (stock, movimientos y totales en una transacción SQL). */
  async register(dto: SaleDto): Promise<Sale> {
    const cfg = await this.settings.get()
    if (!dto.pending && !cfg.payment_methods.includes(dto.payment_method)) throw badRequest('Tipo de pago inválido')
    const tz = env().APP_TIMEZONE
    const created = await this.repo.register({
      items: dto.items,
      pending: dto.pending,
      payment_method: dto.pending ? '' : dto.payment_method,
      student_id: dto.student_id ?? null,
      notes: dto.notes,
      sold_on: todayIso(tz),
      sold_time: nowTime(tz),
    })
    return this.get(created.id)
  }

  /** Cobra una venta que quedó «por cobrar»: registra el tipo de pago y la fecha de cobro (hoy). */
  async collect(id: string, dto: CollectDto): Promise<Sale> {
    const cfg = await this.settings.get()
    if (!cfg.payment_methods.includes(dto.payment_method)) throw badRequest('Tipo de pago inválido')
    const sale = await this.get(id)
    if (sale.status !== 'pending') throw badRequest(`La venta N° ${sale.sale_number} no está por cobrar`)
    await this.repo.collect(id, dto.payment_method, todayIso(env().APP_TIMEZONE))
    return this.get(id)
  }

  async void(id: string): Promise<Sale> {
    await this.get(id)
    await this.repo.void(id, todayIso(env().APP_TIMEZONE))
    return this.get(id)
  }
}
