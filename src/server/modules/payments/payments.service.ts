import { PaymentsRepository } from './payments.repository'
import { StudentsRepository } from '../students/students.repository'
import { SettingsRepository } from '../settings/settings.repository'
import type { PaymentDto } from '../students/students.dto'
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
    if (!cfg.payment_methods.includes(dto.payment_method)) throw badRequest('Tipo de pago inválido')

    const paidOn = dto.paid_on ?? todayIso(env().APP_TIMEZONE)
    const payment = await this.payments.insert({
      student_id: dto.student_id,
      paid_on: paidOn,
      plan_name: plan.name,
      unit: plan.unit,
      quantity: plan.quantity,
      months_equivalent: monthsEquivalent(plan),
      payment_method: dto.payment_method,
      amount: dto.amount,
      due_date: planDueDate(paidOn, plan),
      notes: dto.notes,
    })
    if (student.status !== 'Activo') await this.students.update(student.id, { status: 'Activo', withdrawal_reason: '', withdrawn_on: null })
    return payment
  }
}
