import type { Db } from '@/server/db/client'
import { unwrap } from '@/server/db/client'
import type { Payment } from '@/shared/types'

export class PaymentsRepository {
  constructor(private readonly db: Db) {}

  async listAll(): Promise<Payment[]> {
    const res = await this.db.from('payments').select('*').order('paid_on', { ascending: false })
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
      .order('created_at', { ascending: true })
    return unwrap(res) as (Payment & { student: { first_names: string; last_names: string } | null })[]
  }

  async insert(row: Omit<Payment, 'id' | 'created_at'>): Promise<Payment> {
    return unwrap(await this.db.from('payments').insert(row).select('*').single()) as Payment
  }
}
