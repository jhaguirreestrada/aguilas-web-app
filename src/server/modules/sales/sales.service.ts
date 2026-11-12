import { SalesRepository } from './sales.repository'
import { SettingsRepository } from '../settings/settings.repository'
import type { SaleDto, SalesQuery } from './sales.dto'
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
    if (!cfg.payment_methods.includes(dto.payment_method)) throw badRequest('Tipo de pago inválido')
    const tz = env().APP_TIMEZONE
    const created = await this.repo.register({
      items: dto.items,
      payment_method: dto.payment_method,
      student_id: dto.student_id ?? null,
      notes: dto.notes,
      sold_on: todayIso(tz),
      sold_time: nowTime(tz),
    })
    return this.get(created.id)
  }

  async void(id: string): Promise<Sale> {
    await this.get(id)
    await this.repo.void(id, todayIso(env().APP_TIMEZONE))
    return this.get(id)
  }
}
