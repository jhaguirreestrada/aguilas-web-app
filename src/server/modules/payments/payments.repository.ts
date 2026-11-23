import type { Db } from '@/server/db/client'
import { unwrap } from '@/server/db/client'
import type { Payment } from '@/shared/types'

export class PaymentsRepository {
  constructor(private readonly db: Db) {}

  /** Pagos efectivos (las clases diarias por cobrar no cuentan hasta que se cobran). */
  async listAll(): Promise<Payment[]> {
    const res = await this.db.from('payments').select('*').not('pending', 'is', true).order('paid_on', { ascending: false })
    return unwrap(res) as Payment[]
  }

  /** Clases diarias por cobrar de todos los alumnos. */
  async listPending(): Promise<Payment[]> {
    const res = await this.db.from('payments').select('*').eq('pending', true).order('class_on', { ascending: true })
    return unwrap(res) as Payment[]
  }

  async listByStudent(studentId: string): Promise<Payment[]> {
    const res = await this.db
      .from('payments')
      .select('*')
      .eq('student_id', studentId)
      .order('paid_on', { ascending: false })
      .order('created_at', { ascending: false })
    return unwrap(res) as Payment[]
  }

  /** Pagos de alumnos de un día (cierre de caja), con el nombre del alumno. */
  async listPaidOn(date: string): Promise<(Payment & { student: { first_names: string; last_names: string } | null })[]> {
    const res = await this.db
      .from('payments')
      .select('*, student:students(first_names, last_names)')
      .eq('paid_on', date)
      .not('pending', 'is', true)
      .order('created_at', { ascending: true })
    return unwrap(res) as (Payment & { student: { first_names: string; last_names: string } | null })[]
  }

  async update(id: string, patch: Partial<Omit<Payment, 'id' | 'created_at'>>): Promise<Payment> {
    return unwrap(await this.db.from('payments').update(patch).eq('id', id).select('*').single()) as Payment
  }

  async insert(row: Omit<Payment, 'id' | 'created_at'>): Promise<Payment> {
    return unwrap(await this.db.from('payments').insert(row).select('*').single()) as Payment
  }
}
