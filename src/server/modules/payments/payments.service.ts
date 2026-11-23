import { PaymentsRepository } from './payments.repository'
import { StudentsRepository } from '../students/students.repository'
import { SettingsRepository } from '../settings/settings.repository'
import type { PaymentDto, SettleDto } from '../students/students.dto'
import { badRequest, notFound } from '@/server/common/errors'
import { env } from '@/server/config/env'
import { todayIso } from '@/shared/dates'
import { monthsEquivalent, planDueDate } from '@/shared/domain/payments'
import type { Payment } from '@/shared/types'

export class PaymentsService {
  constructor(
    private readonly payments: PaymentsRepository,
    private readonly students: StudentsRepository,
    private readonly settings: SettingsRepository,
  ) {}

  listByStudent(studentId: string) {
    return this.payments.listByStudent(studentId)
  }

  /** Registra un pago: calcula el vencimiento según el plan y reactiva al alumno si no estaba activo. */
  async register(dto: PaymentDto): Promise<Payment> {
    const student = await this.students.findById(dto.student_id)
    if (!student) throw notFound('Alumno no encontrado')
    if (student.status === 'De baja') throw badRequest('El alumno está de baja. Reactívalo antes de registrar un pago.')

    const cfg = await this.settings.get()
    const plan = cfg.plans.find((p) => p.name === dto.plan_name)
    if (!plan) throw badRequest('El plan seleccionado ya no existe')
    if (dto.pending && plan.unit !== 'days') throw badRequest('Solo las clases diarias pueden quedar por cobrar')
    if (!dto.pending && !cfg.payment_methods.includes(dto.payment_method)) throw badRequest('Tipo de pago inválido')

    const paidOn = dto.paid_on ?? todayIso(env().APP_TIMEZONE)
    const payment = await this.payments.insert({
      student_id: dto.student_id,
      paid_on: paidOn,
      plan_name: plan.name,
      unit: plan.unit,
      quantity: plan.quantity,
      months_equivalent: monthsEquivalent(plan),
      payment_method: dto.pending ? 'Por cobrar' : dto.payment_method,
      amount: dto.amount,
      due_date: planDueDate(paidOn, plan),
      notes: dto.notes,
      pending: dto.pending,
      class_on: dto.pending ? paidOn : null,
    })
    if (student.status !== 'Activo') await this.students.update(student.id, { status: 'Activo', withdrawal_reason: '', withdrawn_on: null })
    return payment
  }

  /**
   * Cobra clases diarias que estaban por cobrar (una o varias a la vez). El monto total se reparte entre las clases
   * elegidas y el ingreso se registra en la fecha del cobro; la fecha de la clase queda en `class_on`.
   */
  async settle(dto: SettleDto): Promise<Payment[]> {
    const student = await this.students.findById(dto.student_id)
    if (!student) throw notFound('Alumno no encontrado')
    const cfg = await this.settings.get()
    if (!cfg.payment_methods.includes(dto.payment_method)) throw badRequest('Tipo de pago inválido')

    const ids = [...new Set(dto.payment_ids)]
    const pending = (await this.payments.listByStudent(dto.student_id)).filter((p) => p.pending)
    const rows = ids.map((id) => pending.find((p) => p.id === id))
    if (rows.some((r) => !r)) throw badRequest('Alguna de las clases seleccionadas ya no está por cobrar')
    if (dto.amount < rows.length) throw badRequest('El monto es menor que la cantidad de clases a cobrar')

    const paidOn = dto.paid_on ?? todayIso(env().APP_TIMEZONE)
    const each = Math.floor(dto.amount / rows.length)
    const out: Payment[] = []
    for (const [i, row] of rows.entries()) {
      const amount = i === rows.length - 1 ? dto.amount - each * (rows.length - 1) : each
      const notes = [row!.notes, dto.notes].filter(Boolean).join(' · ').slice(0, 200)
      out.push(await this.payments.update(row!.id, {
        pending: false, paid_on: paidOn, payment_method: dto.payment_method, amount, notes,
        class_on: row!.class_on ?? row!.paid_on,
      }))
    }
    return out
  }
}
