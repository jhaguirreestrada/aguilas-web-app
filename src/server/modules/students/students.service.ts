import { StudentsRepository, type StudentRow } from './students.repository'
import { PaymentsRepository } from '../payments/payments.repository'
import { SettingsRepository } from '../settings/settings.repository'
import type { StudentDto } from './students.dto'
import { badRequest, conflict, notFound } from '@/server/common/errors'
import { env } from '@/server/config/env'
import { cleanRut, formatRut, validRut } from '@/shared/rut'
import { todayIso } from '@/shared/dates'
import { norm } from '@/shared/format'
import { lastPayment, paymentStatus } from '@/shared/domain/payments'
import { ageOf, weightCategoryOf } from '@/shared/domain/students'
import type { Payment, Settings, Student, StudentSummary, WeightEntry } from '@/shared/types'

export class StudentsService {
  constructor(
    private readonly students: StudentsRepository,
    private readonly payments: PaymentsRepository,
    private readonly settings: SettingsRepository,
  ) {}

  private today() {
    return todayIso(env().APP_TIMEZONE)
  }

  private summarize(s: Student, all: Payment[], cfg: Settings, today: string): StudentSummary {
    const ps = all.filter((p) => !p.pending)
    const pend = all.filter((p) => p.pending)
    const last = lastPayment(ps)
    return {
      ...s,
      full_name: `${s.first_names} ${s.last_names}`.trim(),
      category: weightCategoryOf(s.sex, s.weight_kg == null ? null : Number(s.weight_kg), cfg.weight_categories_female, cfg.weight_categories_male),
      age: ageOf(s.birth_date, today),
      last_payment: last,
      payment_status: paymentStatus(last, cfg.warning_days, today),
      payments_count: ps.length,
      pending_count: pend.length,
      pending_amount: pend.reduce((t, p) => t + p.amount, 0),
    }
  }

  /** Alumnos con su último pago, estado de pago, categoría y edad (ordenados por nombre). */
  async listSummaries(): Promise<StudentSummary[]> {
    const [students, payments, cfg] = await Promise.all([this.students.listAll(), this.payments.listAll(), this.settings.get()])
    const pendings = await this.payments.listPending()
    const today = this.today()
    const byStudent = new Map<string, Payment[]>()
    for (const p of payments) {
      const arr = byStudent.get(p.student_id)
      if (arr) arr.push(p)
      else byStudent.set(p.student_id, [p])
    }
    for (const p of pendings) byStudent.get(p.student_id)?.push(p) ?? byStudent.set(p.student_id, [p])
    return students
      .map((s) => this.summarize(s, byStudent.get(s.id) ?? [], cfg, today))
      .sort((a, b) => a.full_name.localeCompare(b.full_name, 'es'))
  }

  async getSummary(id: string): Promise<StudentSummary> {
    const [s, ps, cfg] = await Promise.all([this.students.findById(id), this.payments.listByStudent(id), this.settings.get()])
    if (!s) throw notFound('Alumno no encontrado')
    return this.summarize(s, ps, cfg, this.today())
  }

  async weightHistory(id: string): Promise<WeightEntry[]> {
    return this.students.weightHistory(id)
  }

  /** Búsqueda de la pantalla Pagos: por RUT (parcial) o por nombre y apellido (todas las palabras). */
  async search(q: string): Promise<StudentSummary[]> {
    q = q.trim()
    if (!q) return []
    const all = await this.listSummaries()
    const c = cleanRut(q)
    if (/^[0-9.\-kK\s]+$/.test(q) && c.length >= 4) return all.filter((a) => cleanRut(a.rut).includes(c))
    const toks = norm(q).split(/\s+/)
    return all.filter((a) => {
      const n = norm(a.full_name)
      return toks.every((t) => n.includes(t))
    })
  }

  async create(dto: StudentDto): Promise<StudentSummary> {
    const row = await this.buildRow(dto, null)
    const saved = await this.students.insert(row)
    if (saved.weight_kg != null) await this.students.addWeight(saved.id, Number(saved.weight_kg))
    return this.getSummary(saved.id)
  }

  async update(id: string, dto: StudentDto): Promise<StudentSummary> {
    const current = await this.students.findById(id)
    if (!current) throw notFound('Alumno no encontrado')
    const row = await this.buildRow(dto, current)
    await this.students.update(id, row)

    // Historial de peso: se registra el peso inicial (si faltaba) y cada cambio posterior.
    const prev = current.weight_kg == null ? null : Number(current.weight_kg)
    if (prev != null && (await this.students.countWeightEntries(id)) === 0) {
      await this.students.addWeight(id, prev, current.created_at)
    }
    if (row.weight_kg != null && row.weight_kg !== prev) await this.students.addWeight(id, row.weight_kg)
    return this.getSummary(id)
  }

  async withdraw(id: string, reason: string): Promise<StudentSummary> {
    if (!(await this.students.findById(id))) throw notFound('Alumno no encontrado')
    await this.students.update(id, { status: 'De baja', withdrawal_reason: reason, withdrawn_on: this.today() })
    return this.getSummary(id)
  }

  async reactivate(id: string): Promise<StudentSummary> {
    if (!(await this.students.findById(id))) throw notFound('Alumno no encontrado')
    await this.students.update(id, { status: 'Activo', withdrawal_reason: '', withdrawn_on: null })
    return this.getSummary(id)
  }

  async remove(id: string): Promise<void> {
    if (!(await this.students.findById(id))) throw notFound('Alumno no encontrado')
    await this.students.remove(id) // los pagos y el historial de peso caen en cascada
  }

  private async buildRow(dto: StudentDto, current: Student | null): Promise<StudentRow> {
    if (!validRut(dto.rut)) throw badRequest('El RUT no es válido (revisa el dígito verificador)')
    const rut = formatRut(dto.rut)
    const dup = await this.students.findByRut(rut)
    if (dup && dup.id !== current?.id) throw conflict('Ya existe un alumno con ese RUT', 'DUPLICATE')

    const cfg = await this.settings.get()
    if (!cfg.student_statuses.includes(dto.status)) throw badRequest('Estado de alumno inválido')

    const today = this.today()
    const withdrawn = dto.status === 'De baja'
    return {
      first_names: dto.first_names,
      last_names: dto.last_names,
      rut,
      birth_date: dto.birth_date,
      sex: dto.sex,
      phone: dto.phone,
      email: dto.email,
      weight_kg: dto.weight_kg,
      notes: dto.notes,
      status: dto.status,
      joined_on: dto.joined_on ?? current?.joined_on ?? today,
      withdrawal_reason: withdrawn ? current?.withdrawal_reason ?? '' : '',
      withdrawn_on: withdrawn ? current?.withdrawn_on ?? today : null,
    }
  }
}
